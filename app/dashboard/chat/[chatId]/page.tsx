import { Id } from "@/convex/_generated/dataModel"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getConvexClient} from "@/lib/Convex"
import { api } from "@/convex/_generated/api"
import ChatInterface from "@/components/ChatInterface"
interface ChatPageProps{
    params:Promise<{
chatId:Id<"chats">
    }>
}

export default async function ChatPage({params}:ChatPageProps){
    const {chatId} = await params;
    const {userId} = await auth();
    const convex = getConvexClient()
    const initialMessages = await convex.query(api.messages.list,{chatId})
    if(!userId){
        redirect('/')
    }
    return (
        <div className="flex-1 overflow-hidden">
        <ChatInterface chatId={chatId} initialMessages={initialMessages}/>
                </div>
               
    )
}

