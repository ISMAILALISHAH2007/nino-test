import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getDb } from '@/lib/db'
import { userSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const db = getDb()
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id))
      .limit(1)

    if (settings.length === 0) {
      return Response.json({
        aiProvider: 'gemini',
        voiceEnabled: true,
        voiceLanguage: 'en-US',
        theme: 'dark',
      })
    }

    return Response.json(settings[0])
  } catch (error) {
    console.error('Settings error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const data = await req.json()
    const db = getDb()

    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(userSettings)
        .set({
          aiProvider: data.aiProvider || existing[0].aiProvider,
          voiceEnabled: data.voiceEnabled !== undefined ? data.voiceEnabled : existing[0].voiceEnabled,
          voiceLanguage: data.voiceLanguage || existing[0].voiceLanguage,
          theme: data.theme || existing[0].theme,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.id, existing[0].id))
    } else {
      await db.insert(userSettings).values({
        id: nanoid(),
        userId: session.user.id,
        aiProvider: data.aiProvider || 'gemini',
        voiceEnabled: data.voiceEnabled ?? true,
        voiceLanguage: data.voiceLanguage || 'en-US',
        theme: data.theme || 'dark',
      })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Settings update error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
