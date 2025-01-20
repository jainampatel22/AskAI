'use client';

import { useState, useRef, useEffect } from 'react';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';
import { chatRequestBody, StreamMessageType } from '@/lib/type';
import { createSSEParser } from '@/lib/createSSEParser';
import { getConvexClient } from '@/lib/Convex';
import { api } from '@/convex/_generated/api';
import { MessageBubble } from './MessageBubble';

interface ChatInterfaceProps {
    chatId: Id<'chats'>;
    initialMessages: Doc<'messages'>[];
}

function ChatInterface({ chatId, initialMessages }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Doc<'messages'>[]>(initialMessages);
    const [loading, setLoading] = useState(false)
    const [input, setInput] = useState("")
    const [streaResponse, setStreaResponse] = useState('')
    const MessageEndRef = useRef<HTMLDivElement>(null)
    const [currentTool, setCurrentTool] = useState<{ name: string, input: unknown } | null>(null)
const formatToolOutput = (output:unknown):string=>{
if(typeof output==="string") return output
return JSON.stringify(output,null,2)
}
    const formatTerminalOutput =async(
    tool:string,
    input:unknown,
    output:unknown
)=>{
const terminalHtml = `
<div class="bg-[#1e1e1e] text-white font-mono p-2 rounded-md my-2 overflow-x-auto whitespace-normal max-w-[600px]
">
<div class ="flex items-center gap-1.5 border-b border-gray-700 pb-1">
<span class="text-red-500">●</span>
<span class="text-yellow-500">●</span>
<span class="text-green-500">●</span>
<span class="text-gray-400 ml-1 text-sm">~/${tool}</span>
</div>
<div class="text-gray-400 mt-1">$ Input </div>
<pre class="text-yellow-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${formatToolOutput((input))}</pre>
<div class="text-gray-400 mt-2">$ Output </div>

<pre class="text-green-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${formatToolOutput((output))}</pre>
</div>
`;
return `---START---\n${terminalHtml}\n---END---`
}
    const ProcessStream = async (
        reader: ReadableStreamDefaultReader<Uint8Array>,
        onChunk: (chunk: string) => Promise<void>
    ) => {
        try {
            while (true) {
                const { done, value } = await reader.read()
                if (done) {
                    break
                } await onChunk(new TextDecoder().decode(value))

            }
        } finally {
            reader.releaseLock()
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const Trimmedinput = input.trim()
        if (!Trimmedinput) return
        setInput("")
        setCurrentTool(null)
        setLoading(true)
        setStreaResponse("")
        const addmessage: Doc<"messages"> = {
            _id: `temp_${Date.now()}`,
            chatId,
            content: Trimmedinput,
            role: "user",
            createdAt: Date.now()
        } as Doc<"messages">
        setMessages((prev) => [...prev, addmessage])
        let fullResponse = ""
        try {
            const requestBody: chatRequestBody = {
                message: messages.map((msg) => (
                    {
                        role: msg.role,
                        content: msg.content
                    }
                )),
                newMessage: Trimmedinput,
                chatId
            }
            const response = await fetch("/api/chat/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
              });
        
            if (!response.ok) throw new Error(await response.text())
            if (!response.body) throw new Error("Enter Message ")

            const reader = response.body.getReader()
            const parser = createSSEParser()
            await ProcessStream(reader,async(chunk)=>{
                const messages = parser.parse(chunk)
                for(const message of messages){
                    switch(message.type){
                        case StreamMessageType.Token:
                            if("token" in message){
                                fullResponse+=message.token;
                                setStreaResponse(fullResponse)
                            } break
                        case StreamMessageType.ToolStart:
                            if("tool" in message){
                                setCurrentTool({
                                    name:message.tool,
                                    input:message.input
                                })
                                fullResponse+=formatTerminalOutput(
                                    message.tool,
                                    message.input,
                                    "Processing Output ...."
                                )
                                setStreaResponse(fullResponse)
                            } break;
                    
                        case StreamMessageType.ToolEnd:
                            if('tool' in message && currentTool){
                        const lastTerminalIndex = fullResponse.lastIndexOf(

                        '<div class="bg-[#1e1e1e]"'
                        )
                        if(lastTerminalIndex !==-1){
                            fullResponse=fullResponse.substring(0,lastTerminalIndex)+
                            formatTerminalOutput(
                                message.tool,
                                currentTool.input,
                                message.output,
                            );
                            setStreaResponse(fullResponse)
                        } 
                        setCurrentTool(null)
                            }
                            break;
                            case StreamMessageType.Error:
                                if("Error" in message){
                                    throw new Error(message.error)
                                }
                                break
                                case StreamMessageType.Done:
                                    const AgentMessage:Doc<"messages">={
                                        _id:`temp_assistant_${Date.now()}`,
                                        chatId,
                                        content:fullResponse,
                                        role:'Agent',
                                        createdAt:Date.now()    
                                    } as Doc<"messages">
                                    const convex = getConvexClient()
                                    await convex.mutation(api.messages.store,{
                                        chatId,
                                        content:fullResponse,
                                        role:"Agent"
                                    })
                                    setMessages((prev)=>[...prev,AgentMessage])
                                    setStreaResponse('')
                                    return;
                        }
                }
            })


        } catch (error) {
            console.log("eror")
            setMessages((prev) =>
                prev.filter((msg) =>
                    msg._id !== addmessage._id))
            setStreaResponse(
                await formatTerminalOutput(
                    "error",
                    "failed to process message",
                    error instanceof Error ? error.message : "Unknown error"
                ));
        }
        finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        MessageEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, streaResponse])
    return (
        <main className='flex flex-col h-[calc(100vh-theme(spacing.14))]'>
            <section className='flex-1 overflow-y-auto bg-gray-50 p-2 md:p-0'>
                <div className='max-w-4xl mx-auto p-4 space-y-3'>
                    {
                        messages.map((message) => (
                            <MessageBubble key={message._id}  content={message.content} isUser={message.role==='user'}/>
        ))

                    }
        {streaResponse && <MessageBubble content={streaResponse}/>}
        {
            loading && !streaResponse &&(
                <div className='flex justify-start animate-in fade-in-0'>
                    <div className='rounded-xl px-4 py-3 bg-white text-gray-900 rouned-bl-none shadow-sm ring-1 ring-inset ring-gray-200'>
                        {
                            [0.3,0.15,0].map((delay,i)=>(
                                <div key={i} className='h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce' style={{animationDelay:`-${delay}`}}>

                                </div>
                            ))
                        }
                    </div>

                </div>
            )
        }
                </div>
                <div ref={MessageEndRef}>

                </div>
            </section>
            <footer className='border-t bg-white p-4'>
                <form onSubmit={handleSubmit} className='max-w-4xl mx-auto relative' >
                    <div className='relative flex items-center'>
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder='Message Ai Agent...' className='flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus-ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500' disabled={loading} />
                        <Button type='submit' disabled={loading || !input.trim()} className={`absolute right-1.5 rounded-xl h-9 w-9 p-0 flex items-center justify-center transition-all ${input.trim() ? "bg-blue-600 hover:bg-blue-800 text-white shadow-sm" : "bg-gray-100 text-gray-400"}`}>
                            <ArrowRight />

                        </Button>
                    </div>
                </form>
            </footer>
        </main>
    );
}

export default ChatInterface;
