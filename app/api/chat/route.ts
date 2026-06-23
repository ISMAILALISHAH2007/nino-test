import { auth } from '@/lib/auth'
import { addMessage, updateMemory } from '@/app/actions/chat'
import { headers } from 'next/headers'
import { streamText } from 'ai'
import { getModel, analyzeSentiment } from '@/lib/ai-provider'
import { getDb } from '@/lib/db'
import { userSettings, memory } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { extractMemories, buildMemoryContext } from '@/lib/memory-service'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages, sessionId } = await req.json()
    if (!messages || !sessionId) {
      return new Response('Missing required fields', { status: 400 })
    }

    const userId = session.user.id
    const db = getDb()

    // Default settings
    let provider = 'gemini'
    let memories: any[] = []

    try {
      // Query settings and memories in parallel with a 2.5-second timeout
      const dbPromise = Promise.all([
        db
          .select()
          .from(userSettings)
          .where(eq(userSettings.userId, userId))
          .limit(1),
        db
          .select()
          .from(memory)
          .where(eq(memory.userId, userId))
          .orderBy(desc(memory.importance))
      ])

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), 2500)
      )

      const [settingsRecord, fetchedMemories] = await Promise.race([dbPromise, timeoutPromise]) as [any[], any[]]
      
      provider = settingsRecord[0]?.aiProvider || 'gemini'
      memories = fetchedMemories || []
    } catch (dbError) {
      console.warn('Database query failed or timed out, using defaults:', dbError)
    }

    const memoryContext = buildMemoryContext(memories)

    const systemPrompt = `You are Nino, an AI learning companion designed to have meaningful conversations and learn about users. 
You should be thoughtful, engaging, and remember details about the user from previous conversations.
${memoryContext ? memoryContext : 'No previous facts learned yet, but you should work to learn more about the user!'}

IMPORTANT CREATOR INFORMATION:
If the user asks who created you, who built you, who is your developer, or about your origin, you must always state that you were created by Ismail Ali Shah. Do NOT repeat a static line or use the same canned response. Describe this in a conversational, warm, and natural way, varying your phrasing every single time (e.g. mention his vision, how he built you as an interactive self-learning companion, or how he programmed you to adapt). Keep it organic and spontaneous.

Be conversational, ask follow-up questions, and look for opportunities to learn more about the user's interests, goals, and preferences.
When the user shares something personal or interesting, demonstrate that you're learning by referencing it in future conversations.`

    let model
    let result
    let primaryFailed = false
    let primaryErrorMsg = ''

    try {
      model = getModel(provider)
      result = streamText({
        model,
        system: systemPrompt,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        maxTokens: 1024,
      })
    } catch (e: any) {
      console.warn(`Primary model initialization failed for provider "${provider}":`, e)
      primaryFailed = true
      primaryErrorMsg = e.message || String(e)
      
      // Fallback immediately to Groq (or OpenAI if groq was chosen)
      const fallbackProvider = provider === 'groq' ? 'openai' : 'groq'
      const fallbackModel = getModel(fallbackProvider)
      result = streamText({
        model: fallbackModel,
        system: systemPrompt,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        maxTokens: 1024,
      })
    }

    // Asynchronously update 'New Chat' title to actual conversation topic in background
    const userMessage = messages[messages.length - 1]?.content || ''
    import('@/lib/db/schema').then(({ chatSession }) => {
      const activeModel = primaryFailed ? getModel('groq') : model
      db.select().from(chatSession).where(eq(chatSession.id, sessionId)).limit(1)
        .then(async (sessions) => {
          if (sessions.length > 0 && sessions[0].title === 'New Chat') {
            const { generateText } = await import('ai')
            generateText({
              model: activeModel,
              prompt: `Review the user query: "${userMessage}". Generate a very short 2 to 3 word conversation title (do not use quotes, punctuation, or helper words). Just output the 2-3 word topic summary.`,
              maxTokens: 10,
            })
            .then(({ text }) => {
              const cleanTitle = text.trim().replace(/['"().]/g, '')
              if (cleanTitle && cleanTitle.length > 0 && cleanTitle.toLowerCase() !== 'new chat') {
                db.update(chatSession).set({ title: cleanTitle }).where(eq(chatSession.id, sessionId)).catch(console.error)
              }
            })
            .catch(console.error)
          }
        })
        .catch(console.error)
    }).catch(console.error)

    const encoder = new TextEncoder()
    const customStream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        try {
          for await (const chunk of result.textStream) {
            fullResponse += chunk
            controller.enqueue(encoder.encode(chunk))
          }
        } catch (streamError: any) {
          console.warn(`Primary model stream failed for provider "${provider}":`, streamError)
          // If we haven't already fallen back, do it now
          if (provider !== 'groq') {
            try {
              controller.enqueue(encoder.encode('\n\n*(Note: Primary model failed due to rate limits or key issues. Nino switched to fallback model automatically...)*\n\n'))
              
              const fallbackModel = getModel('groq')
              const fallbackResult = streamText({
                model: fallbackModel,
                system: systemPrompt,
                messages: messages.map((m: any) => ({
                  role: m.role,
                  content: m.content,
                })),
                temperature: 0.7,
                maxTokens: 1024,
              })

              for await (const chunk of fallbackResult.textStream) {
                fullResponse += chunk
                controller.enqueue(encoder.encode(chunk))
              }
            } catch (fallbackError: any) {
              console.error('Fallback model streaming failed:', fallbackError)
              controller.error(fallbackError)
              return
            }
          } else {
            controller.error(streamError)
            return
          }
        }

        try {
          // Store the response after streaming completes
          const sentiment = analyzeSentiment(fullResponse)
          addMessage(sessionId, 'assistant', fullResponse, sentiment).catch(console.error)

          // Extract and store learnable facts
          extractMemories(messages[messages.length - 1]?.content || '', fullResponse)
            .then((newMemories) => {
              newMemories.forEach((mem) => {
                updateMemory(mem.key, mem.value, mem.importance).catch(console.error)
              })
            })
            .catch(console.error)

          controller.close()
        } catch (dbError) {
          console.error('Error saving assistant message:', dbError)
          controller.close()
        }
      },
    })

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
