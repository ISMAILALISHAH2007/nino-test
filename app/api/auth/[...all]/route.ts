import { toNextJsHandler } from 'better-auth/next-js'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, ctx: any) {
  const { auth } = await import('@/lib/auth')
  const { GET: handler } = toNextJsHandler(auth.handler)
  return handler(req, ctx)
}

export async function POST(req: Request, ctx: any) {
  const { auth } = await import('@/lib/auth')
  const { POST: handler } = toNextJsHandler(auth.handler)
  return handler(req, ctx)
}
