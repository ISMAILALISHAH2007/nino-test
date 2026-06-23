'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { chatSession, message, memory } from '@/lib/db/schema'
import { headers } from 'next/headers'
import { eq, desc, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function createChatSession(title: string) {
  const userId = await getUserId()
  const sessionId = nanoid()
  
  await db.insert(chatSession).values({
    id: sessionId,
    userId,
    title: title || 'New Chat',
  })
  
  return sessionId
}

export async function getChatSessions() {
  const userId = await getUserId()
  return db
    .select()
    .from(chatSession)
    .where(eq(chatSession.userId, userId))
    .orderBy(desc(chatSession.updatedAt))
}

export async function getSessionMessages(sessionId: string) {
  const userId = await getUserId()
  return db
    .select()
    .from(message)
    .where(and(eq(message.sessionId, sessionId), eq(message.userId, userId)))
    .orderBy(message.createdAt)
}

export async function addMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  sentiment?: string
) {
  const userId = await getUserId()
  const messageId = nanoid()
  
  await db.insert(message).values({
    id: messageId,
    sessionId,
    userId,
    role,
    content,
    sentiment: sentiment || null,
  })
  
  // Update session timestamp
  await db.update(chatSession)
    .set({ updatedAt: new Date() })
    .where(eq(chatSession.id, sessionId))
  
  return messageId
}

export async function getUserMemories() {
  const userId = await getUserId()
  return db
    .select()
    .from(memory)
    .where(eq(memory.userId, userId))
    .orderBy(desc(memory.importance))
}

export async function updateMemory(key: string, value: string, importance: number = 1) {
  const userId = await getUserId()
  const existingMemory = await db
    .select()
    .from(memory)
    .where(and(eq(memory.userId, userId), eq(memory.key, key)))
    .limit(1)
  
  if (existingMemory.length > 0) {
    await db
      .update(memory)
      .set({ value, importance, updatedAt: new Date() })
      .where(eq(memory.id, existingMemory[0].id))
  } else {
    const memoryId = nanoid()
    await db.insert(memory).values({
      id: memoryId,
      userId,
      key,
      value,
      importance,
    })
  }
}

export async function deleteChatSession(sessionId: string) {
  const userId = await getUserId()
  await db
    .delete(chatSession)
    .where(and(eq(chatSession.id, sessionId), eq(chatSession.userId, userId)))
}

export async function updateMessage(messageId: string, content: string, sentiment?: string) {
  const userId = await getUserId()
  await db
    .update(message)
    .set({ 
      content,
      sentiment: sentiment || null,
    })
    .where(and(eq(message.id, messageId), eq(message.userId, userId)))
}
