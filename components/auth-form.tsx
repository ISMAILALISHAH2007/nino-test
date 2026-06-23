'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'sign-up') {
        await authClient.signUp.email({
          email,
          password,
          name,
        })
      } else {
        await authClient.signIn.email({
          email,
          password,
        })
      }
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      {mode === 'sign-up' && (
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 bg-white/10 dark:bg-zinc-950/30 border border-slate-200/50 dark:border-white/10 rounded-xl text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-semibold text-sm"
          required
        />
      )}
      <input
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2.5 bg-white/10 dark:bg-zinc-950/30 border border-slate-200/50 dark:border-white/10 rounded-xl text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-semibold text-sm"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2.5 bg-white/10 dark:bg-zinc-950/30 border border-slate-200/50 dark:border-white/10 rounded-xl text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-semibold text-sm"
        required
      />
      {error && <div className="text-red-500 text-xs font-bold py-1">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
      >
        {loading ? 'Processing...' : mode === 'sign-up' ? 'Create Account' : 'Sign In'}
      </button>
    </form>
  )
}
