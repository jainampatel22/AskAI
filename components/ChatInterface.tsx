'use client';

import { useState } from 'react';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

interface ChatInterfaceProps {
  chatId: Id<'chats'>;
  initialMessages: Doc<'messages'>[];
}

function ChatInterface({ chatId, initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Doc<'messages'>[]>(initialMessages);
const [loading, setLoading] = useState(false)
const [input, setInput] = useState("")
return (
    <main>
        <section>

        </section>
        <footer className='border-t bg-white p-4'>
            <form >
                <div className='relative flex items-center'>
                    <input type="text" value={input} onChange={(e)=>setInput(e.target.value)} placeholder='Message Ai Agent...' className='flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus-ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500' disabled={loading} />
<Button type='submit' disabled={loading|| !input.trim()} className={`absolute right-1.5 rounded-xl h-9 w-9 p-0 flex items-center justify-center transition-all ${input.trim()?"bg-blue-600 hover:bg-blue-800 text-white shadow-sm":"bg-gray-100 text-gray-400"}`}>
<ArrowRight/>

</Button>
                </div>
            </form>
        </footer>
    </main>
  );
}

export default ChatInterface;
