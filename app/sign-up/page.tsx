import { AuthForm } from '@/components/auth-form'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sign Up - Nino',
  description: 'Create a new Nino account',
}

export default async function SignUpPage() {
  const { auth } = await import('@/lib/auth')
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden liquid-glass-bg">
      {/* Background orbs */}
      <div className="liquid-orb orb-1" />
      <div className="liquid-orb orb-2" />
      <div className="liquid-orb orb-3" />

      <div className="w-full max-w-md z-10 glass-panel p-8 rounded-3xl border border-slate-200/40 dark:border-white/10 shadow-2xl relative">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/25 mx-auto mb-4">
            N
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">Nino AI</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm font-semibold">Your AI learning companion</p>
        </div>
        <AuthForm mode="sign-up" />
        <p className="text-center text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-6">
          Already have an account?{' '}
          <a href="/sign-in" className="text-violet-600 dark:text-violet-400 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
