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
    MessagesAnnotation,
    START,
    StateGraph,
  } from "@langchain/langgraph";
  import {
    ChatPromptTemplate,
    MessagesPlaceholder,
  } from "@langchain/core/prompts";
import SYSTEM_MESSAGE from "@/constants/SystemMessage";
const toolClient = new wxflows({
    endpoint:process.env.WXFLOWS_ENDPOINT || '',
    apikey:process.env.WXFLOWS_APIKEY
})
const tools = await toolClient.lcTools
const toolNode = new ToolNode(tools)
const initialiseModal =()=>{
    const model = new ChatGoogleGenerativeAI({
        modelName: "gemini-pro",
        maxOutputTokens: 2048,
        apiKey:process.env.GOOGLE_GEMINI_API_KEY,
        temperature:0.7,
        
        streaming:true
      }).bindTools(tools)
      return model
}

const createWorkFlow = ()=>{
    const model = initialiseModal();
    const stateGraph = new StateGraph(MessagesAnnotation).addNode('agent',async(state)=>{
        const systemContent = SYSTEM_MESSAGE
        const promptTemplate = ChatPromptTemplate.fromMessages([
            new SystemMessage(systemContent, {
                cache_control: { type: "ephemeral" }
            }),
            new MessagesPlaceholder("messages")
        ]);
        
    })
    
}