// lib/websocketServer.ts
import { submitQuestion } from "@/lib/langgraph";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { getConvexClient } from "@/lib/Convex";
import { ChatRequestBody, StreamMessageType } from "@/lib/type";
import WebSocket from 'ws';

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', async (message: string) => {
    try {
      const { userId } = await auth(); // Assuming you have a way to get userId from the message or context
      if (!userId) {
        ws.send(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      const { messages, newMessage, chatId } = JSON.parse(message) as ChatRequestBody;
      const convex = getConvexClient();

      // Send user message to Convex
      await convex.mutation(api.messages.send, {
        chatId,
        content: newMessage,
      });

      // Convert messages to LangChain format
      const langChainMessages = [
        ...messages.map((msg) =>
          msg.role === "user"
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content)
        ),
        new HumanMessage(newMessage),
      ];

      try {
        // Create the event stream
        const eventStream = await submitQuestion(langChainMessages, chatId);

        // Process the events
        for await (const event of eventStream) {
          if (event.event === "on_chat_model_stream") {
            const token = event.data.chunk;
            if (token) {
              const text = token.content.at(0)?.["text"];
              if (text) {
                ws.send(JSON.stringify({
                  type: StreamMessageType.Token,
                  token: text,
                }));
              }
            }
          } else if (event.event === "on_tool_start") {
            ws.send(JSON.stringify({
              type: StreamMessageType.ToolStart,
              tool: event.name || "unknown",
              input: event.data.input,
            }));
          } else if (event.event === "on_tool_end") {
            const toolMessage = new ToolMessage(event.data.output);
            ws.send(JSON.stringify({
              type: StreamMessageType.ToolEnd,
              tool: toolMessage.lc_kwargs.name || "unknown",
              output: event.data.output,
            }));
          }
        }

        // Send completion message
        ws.send(JSON.stringify({ type: StreamMessageType.Done }));
      } catch (streamError) {
        console.error("Error in event stream:", streamError);
        ws.send(JSON.stringify({
          type: StreamMessageType.Error,
          error: streamError instanceof Error ? streamError.message : "Stream processing failed",
        }));
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(JSON.stringify({
        type: StreamMessageType.Error,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Function to initialize the WebSocket server
export const initializeWebSocketServer = (req: any, socket: any) => {
  wss.handleUpgrade(req, socket, Buffer.alloc(0), (ws) => {
    wss.emit('connection', ws, req);
  });
};