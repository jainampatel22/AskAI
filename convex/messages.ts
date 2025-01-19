import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
// const SHOW_COMMENTS = false;
export const list = query({
    args: { chatId: v.id("chats") },
    handler: async (ctx, args) => {
        const messages = await ctx.db.query("messages").withIndex('by_chat', (q) => q.eq("chatId", args.chatId)).order("asc").collect()
        return messages
    }
})
export const send = mutation({
    args: {
        chatId: v.id("chats"),
        content: v.string()
    },
    handler: async (ctx, args) => {
        const messageId = await ctx.db.insert("messages", {
            chatId: args.chatId,
            content: args.content.replace(/\,n/g, "\\n"),
            role: 'user',
            createdAt: Date.now()
        })
        return messageId
    }

})
export const store = mutation({
    args: {
        chatId: v.id("chats"),
        content: v.string(),
        role: v.union(v.literal("user"), v.literal('Agent'))
    },
    handler: async (ctx, args) => {
        const messageId = await ctx.db.insert("messages", {
            chatId: args.chatId,
            content: args.content.replace(/\,n/g, "\\n").replace(/\\/g, '////'),
            role: args.role,
            createdAt: Date.now()
        })
        return messageId
    }

})

export const lastMessages = query({
    args: { chatId: v.id("chats") },
    handler: async (ctx, args) => {
        const LastMessage = await ctx.db.query("messages").withIndex('by_chat', (q) => q.eq("chatId", args.chatId)).order("desc").first()
        return LastMessage
    }
})