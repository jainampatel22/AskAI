import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import wxflows from "@wxflows/sdk/langchain"
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    trimMessages,
  } from "@langchain/core/messages";
import {
    END,
    MemorySaver,
    MessagesAnnotation,
    START,
    StateGraph,
  } from "@langchain/langgraph";
  import {
    ChatPromptTemplate,
    MessagesPlaceholder,
  } from "@langchain/core/prompts";
import SYSTEM_MESSAGE from "@/constants/SystemMessage";
if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.error("Gemini API Key is missing");
}
if (!process.env.WXFLOWS_APIKEY) {
    console.error("WXFlows API Key is missing");
}
const toolClient = new wxflows({
    endpoint:process.env.WXFLOWS_ENDPOINT || '',
    apikey:process.env.WXFLOWS_APIKEY
})

const trimmer=trimMessages({
    maxTokens:100,
    strategy:"last",
    tokenCounter:(msg)=>msg.length,
    includeSystem:true,
    allowPartial:false,
    startOn:"human"
})
console.log("Initializing tools with endpoint:", process.env.WXFLOWS_ENDPOINT);
const tools = await toolClient.lcTools.catch()

console.log("Initialized Tools:", tools);
const toolNode = new ToolNode(tools)
const initialiseModal =()=>{
    const model = new ChatGoogleGenerativeAI({
        modelName: "gemini-1.5-flash",
        maxOutputTokens: 2048,
        apiKey:process.env.GOOGLE_GEMINI_API_KEY,
        temperature:0.7,
        streaming:true
      }).bindTools(tools)
      return model
}
function shouldContinue(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1] as AIMessage;
  
    // If the LLM makes a tool call, then we route to the "tools" node
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }
  
    // If the last message is a tool message, route back to agent
    if (lastMessage.content && lastMessage._getType() === "tool") {
      return "agent";
    }
  
    // Otherwise, we stop (reply to the user)
    return END;
  }
  
  // Define a new graph
  const createWorkflow = () => {
    const model = initialiseModal();
  
    return new StateGraph(MessagesAnnotation)
      .addNode("agent", async (state) => {
        // Create the system message content
        const systemContent = SYSTEM_MESSAGE;
  
        // Create the prompt template with system message and messages placeholder
        const promptTemplate = ChatPromptTemplate.fromMessages([
          new SystemMessage(systemContent, {
            cache_control: { type: "ephemeral" },
          }),
          new MessagesPlaceholder("messages"),
        ]);
  
        // Trim the messages to manage conversation history
        const trimmedMessages = await trimmer.invoke(state.messages);
  
        // Format the prompt with the current messages
        const prompt = await promptTemplate.invoke({ messages: trimmedMessages });
  
        // Get response from the model
        const response = await model.invoke(prompt);
        
        // Add logging to show we got a response
        console.log("🎉 Got response from model:", response);
  
        return { messages: [response] };
      })
      .addNode("tools", toolNode)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", shouldContinue)
      .addEdge("tools", "agent");
  };
  function addCachingHeaders(messages: BaseMessage[]) {
    if (!messages.length) return messages;
  
    // Create a copy of messages to avoid mutating the original
    const cachedMessages = [...messages];
  
    // Helper to add cache control
    const addCache = (message: BaseMessage) => {
      // Only transform if the content is a string
      if (typeof message.content === 'string') {
        message.content = [
          {
            type: "text",
            text: message.content,
            cache_control: { type: "ephemeral" },
          },
        ];
      }
      // If content is already an array, ensure it's not empty
      else if (Array.isArray(message.content) && message.content.length === 0) {
        message.content = [{
          type: "text",
          text: "",  // Provide a default empty string instead of empty array
          cache_control: { type: "ephemeral" },
        }];
      }
    };
  
    // Filter out any messages with empty content before adding cache
    const validMessages = cachedMessages.filter(msg => 
      msg.content !== undefined && 
      msg.content !== null && 
      (typeof msg.content === 'string' ? msg.content.length > 0 : true)
    );
  
    // Add cache to valid messages
    validMessages.forEach(message => addCache(message));
  
    return validMessages;
  }
  
  
  export async function submitQuestion(messages: BaseMessage[], chatId: string) {
    // Add validation before processing
    const validMessages = messages.filter(msg => {
      if (!msg.content) return false;
      if (typeof msg.content === 'string') return msg.content.trim().length > 0;
      if (Array.isArray(msg.content)) return msg.content.length > 0;
      return true;
    });
  
    // Add caching headers to valid messages
    const cachedMessages = addCachingHeaders(validMessages);
  
    // Create workflow with chatId and onToken callback
    const workflow = createWorkflow();
  
    // Create a checkpoint to save the state of the conversation
    const checkpointer = new MemorySaver();
    const app = workflow.compile({ checkpointer });
  
    const stream =  app.streamEvents(
      { messages: cachedMessages },
      {
        version: "v2",
        configurable: { thread_id: chatId },
        streamMode: "messages",
        runId: chatId,
      }
    );
    return stream;
  } 