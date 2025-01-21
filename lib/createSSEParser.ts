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
      console.log("Incoming chunk:", chunk); // Log the incoming chunk
      const lines = (buffer + chunk).split("\n");
      // Save last potentially incomplete line
      buffer = lines.pop() || "";
  
      const parsedMessages = lines
        .map((line) => {
          const trimmed = line.trim();
          console.log("Trimmed line:", trimmed); // Log the trimmed line
  
          // Skip if empty or missing the SSE_DATA_PREFIX
          if (!trimmed || !trimmed.startsWith(SSE_DATA_PREFIX)) {
            console.warn("Skipping line, not valid SSE:", trimmed);
            return null;
          }
  
          const data = trimmed.substring(SSE_DATA_PREFIX.length);
          console.log("Data extracted:", data); // Log the extracted data
  
          // Handle done message
          if (data === SSE_DONE_MESSAGE) {
            console.log("Parsed Done message"); // Log when Done message is parsed
            return { type: StreamMessageType.Done };
          }
  
          // Try parsing the data as JSON
          try {
            const parsed = JSON.parse(data) as StreamMessage;
            console.log("Parsed message:", parsed); // Log parsed message
            return Object.values(StreamMessageType).includes(parsed.type)
              ? parsed
              : null;
          } catch (error) {
            console.error("Failed to parse SSE message:", error, "Data:", data); // Log error with data context
            return {
              type: StreamMessageType.Error,
              error: "Failed to parse SSE message",
            };
          }
        })
        .filter((msg): msg is StreamMessage => msg !== null); // Filter out null values
  
      console.log("Parsed messages:", parsedMessages); // Log all parsed messages
      return parsedMessages;
    };
  
    return { parse };
  };