import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ChatPage } from '@/components/chat-page'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Nino - Chat',
}

export default async function Home() {
  const { auth } = await import('@/lib/auth')
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <main>
      <ChatPage />
    </main>
  )
}
