// import { WebSocketServer } from "ws"; // Correctly import the WebSocket Server class
// import { submitQuestion } from "@/lib/langgraph";
// import { api } from "@/convex/_generated/api";
// import { auth } from "@clerk/nextjs/server";
// import { AIMessage, BaseMessageFields, HumanMessage, ToolMessage } from "@langchain/core/messages";
// import { getConvexClient } from "@/lib/Convex";
// import { StreamMessageType } from "@/lib/type";

// // Create a WebSocket server
// const wss = new WebSocketServer({ port: 3001 }); // Change the port if needed

// wss.on('connection', (ws) => {
//   console.log('A user connected');

//   ws.on('message', async (message) => {
//     const { messages, newMessage, chatId } = JSON.parse(message);

//     try {
//       const { userId } = await auth();
//       if (!userId) {
//         ws.send(JSON.stringify({ error: "Unauthorized" }));
//         return;
//       }

//       const convex = getConvexClient();

//       // Send user message to Convex
//       await convex.mutation(api.messages.send, {
//         chatId,
//         content: newMessage,
//       });

//       // Convert messages to LangChain format
//       const langChainMessages = [
//         ...messages.map((msg: { role: string; content: string | BaseMessageFields; }) =>
//           msg.role === "user"
//             ? new HumanMessage(msg.content)
//             : new AIMessage(msg.content)
//         ),
//         new HumanMessage(newMessage),
//       ];

//       try {
//         // Create the event stream
//         const eventStream = await submitQuestion(langChainMessages, chatId);

//         // Process the events
//         for await (const event of eventStream) {
//           if (event.event === "on_chat_model_stream") {
//             const token = event.data.chunk;
//             if (token) {
//               const text = token.content.at(0)?.["text"];
//               if (text) {
//                 ws.send(JSON.stringify({
//                   type: StreamMessageType.Token,
//                   token: text,
//                 }));
//               }
//             }
//           } else if (event.event === "on_tool_start") {
//             ws.send(JSON.stringify({
//               type: StreamMessageType.ToolStart,
//               tool: event.name || "unknown",
//               input: event.data.input,
//             }));
//           } else if (event.event === "on_tool_end") {
//             const toolMessage = new ToolMessage(event.data.output);
//             ws.send(JSON.stringify({
//               type: StreamMessageType.ToolEnd,
//               tool: toolMessage.lc_kwargs.name || "unknown",
//               output: event.data.output,
//             }));
//           }
//         }

//         // Send completion message
//         ws.send(JSON.stringify({ type: StreamMessageType.Done }));
//       } catch (streamError) {
//         console.error("Error in event stream:", streamError);
//         ws.send(JSON.stringify({
//           type: StreamMessageType.Error,
//           error: streamError instanceof Error ? streamError.message : "Stream processing failed",
//         }));
//       }
//     } catch (error) {
//       console.error("Error in chat API:", error);
//       ws.send(JSON.stringify({
//         type: StreamMessageType.Error,
//         error: error instanceof Error ? error.message : "Unknown error",
//       }));
//     }
//   });

//   ws.on('close', () => {
//     console.log('User  disconnected');
//   });
// });

// console.log('WebSocket server is running on ws://localhost:3001');