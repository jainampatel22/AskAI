import {
    SSE_DONE_MESSAGE,
    StreamMessageType,
    SSE_DATA_PREFIX,
    StreamMessage,
  } from "./type";
  
  /**
   * Creates a parser for Server-Sent Events (SSE) streams.
   * SSE allows real-time updates from server to client.
   */
  export const createSSEParser = () => {
    let buffer = "";
  
    const parse = (chunk: string): StreamMessage[] => {
      // Combine buffer with new chunk and split into lines
      const lines = (buffer + chunk).split("\n");
      // Save last potentially incomplete line
      buffer = lines.pop() || "";
  
      return lines
        .map((line) => {
          const trimmed = line.trim();
          
          // Skip if empty or missing the SSE_DATA_PREFIX
          if (!trimmed || !trimmed.startsWith(SSE_DATA_PREFIX)) return null;
          
          const data = trimmed.substring(SSE_DATA_PREFIX.length);
          
          // Handle done message
          if (data === SSE_DONE_MESSAGE) return { type: StreamMessageType.Done };
          
          // Try parsing the data as JSON
          try {
            const parsed = JSON.parse(data) as StreamMessage;
            // Ensure valid StreamMessage
            return Object.values(StreamMessageType).includes(parsed.type) ? parsed : null;
          } catch (error) {
            console.error("Failed to parse SSE message:", error);  // Add logging for error
            return {
              type: StreamMessageType.Error,
              error: "Failed to parse SSE message",
            };
          }
        })
        .filter((msg): msg is StreamMessage => msg !== null); // Filter out null values
    };
  
    return { parse };
  };
  