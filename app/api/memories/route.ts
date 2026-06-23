import { getDb } from '@/lib/db'
import { memory, userSettings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const db = getDb()
    const userMemories = await db
      .select()
      .from(memory)
      .where(eq(memory.userId, session.user.id))
      .orderBy(memory.createdAt)

    return Response.json(userMemories)
  } catch (error) {
    console.error('Error fetching memories:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { key, value, importance = 5 } = await req.json()

    if (!key || !value) {
      return new Response('Missing required fields', { status: 400 })
    }

    const db = getDb()
    
    // Check if memory already exists
    const existing = await db
      .select()
      .from(memory)
      .where(and(
        eq(memory.userId, session.user.id),
        eq(memory.key, key)
      ))
      .limit(1)

    if (existing.length > 0) {
      // Update existing memory
      await db
        .update(memory)
        .set({
          value,
          importance,
          updatedAt: new Date(),
        })
        .where(eq(memory.id, existing[0].id))

      return Response.json(existing[0])
    }

    // Create new memory
    const newMemory = {
      id: nanoid(),
      userId: session.user.id,
      key,
      value,
      importance,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.insert(memory).values(newMemory)

    return Response.json(newMemory, { status: 201 })
  } catch (error) {
    console.error('Error creating memory:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return new Response('Missing memory ID', { status: 400 })
    }

    const db = getDb()
    
    // Verify ownership
    const memoryRecord = await db
      .select()
      .from(memory)
      .where(eq(memory.id, id))
      .limit(1)

    if (!memoryRecord.length || memoryRecord[0].userId !== session.user.id) {
      return new Response('Memory not found', { status: 404 })
    }

    await db.delete(memory).where(eq(memory.id, id))

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting memory:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
