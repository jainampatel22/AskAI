import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/Convex";
import { submitQuestion } from "@/lib/langgraph";
import { 
  chatRequestBody, 
  SSE_DATA_PREFIX, 
  SSE_LINE_DELIMITER, 
  StreamMessage, 
  StreamMessageType 
} from "@/lib/type";
import { auth } from "@clerk/nextjs/server";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";

async function SendSseMessage(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  data: StreamMessage
) {
  const encoder = new TextEncoder();
  return writer.write(
    encoder.encode(
      `${SSE_DATA_PREFIX}${JSON.stringify(data)}${SSE_LINE_DELIMITER}`
    )
  );
}

export async function POST(req: Request) {
  let writer = new TransformStream().writable.getWriter();
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = (await req.json()) as chatRequestBody;
    const { message, newMessage, chatId } = body;
    const convex = getConvexClient();

    // Create stream with higher buffer for better performance
    const stream = new TransformStream({}, { highWaterMark: 1024 * 16 });
    writer = stream.writable.getWriter();

    const response = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no"
      }
    });

    // Start processing in background
    (async () => {
      try {
        // Send connected message
        await SendSseMessage(writer, { type: StreamMessageType.Connected });

        // Save message to Convex
        await convex.mutation(api.messages.send, {
          chatId,
          content: newMessage
        });

        // Prepare messages for LangChain
        const langMessages = [
          ...message.map((msg) =>
            msg.role === 'user' 
              ? new HumanMessage(msg.content) 
              : new AIMessage(msg.content)
          ),
          new HumanMessage(newMessage)
        ];

        // Process stream
        const eventStream = await submitQuestion(langMessages, chatId);
        
        let hasError = false;
        for await (const event of eventStream) {
          if (hasError) break;

          try {
            switch (event.event) {
              case "on_chat_model_stream":
                const token = event.data.chunk;
                if (token) {
                  const text = token.content.at(0)?.['text'];
                  if (text) {
                    await SendSseMessage(writer, {
                      type: StreamMessageType.Token,
                      token: text
                    });
                  }
                }
                break;

              case "on_tool_start":
                await SendSseMessage(writer, {
                  type: StreamMessageType.ToolStart,
                  tool: event.name || "unknown",
                  input: event.data.input
                });
                break;

              case "on_tool_end":
                const toolMessage = new ToolMessage(event.data.input);
                await SendSseMessage(writer, {
                  type: StreamMessageType.ToolEnd,
                  tool: toolMessage.lc_kwargs.name || "unknown",
                  output: event.data.output
                });
                break;
            }
          } catch (eventError) {
            console.error("Error processing event:", eventError);
            hasError = true;
            await SendSseMessage(writer, {
              type: StreamMessageType.Error,
              error: eventError instanceof Error ? eventError.message : "Error processing event"
            });
          }
        }

        if (!hasError) {
          await SendSseMessage(writer, { type: StreamMessageType.Done });
        }

      } catch (error) {
        console.error("Stream processing error:", error);
        await SendSseMessage(writer, {
          type: StreamMessageType.Error,
          error: error instanceof Error ? error.message : "Stream processing failed"
        });
      } finally {
        try {
          await writer.close();
        } catch (closingError) {
          console.error("Error closing writer:", closingError);
        }
      }
    })();

    return response;

  } catch (error) {
    console.error("API route error:", error);
    try {
      await SendSseMessage(writer, {
        type: StreamMessageType.Error,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
      await writer.close();
    } catch (finalError) {
      console.error("Error sending final error message:", finalError);
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}