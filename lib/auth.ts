import { betterAuth } from 'better-auth'
import { getPool } from '@/lib/db'

// Lazy initialization to avoid DB connection during build
let authInstance: ReturnType<typeof betterAuth> | undefined

function initAuth() {
  if (authInstance) return authInstance

  const pool = getPool()

  authInstance = betterAuth({
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || (() => {
      if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      }
      if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`
      }
      if (process.env.V0_RUNTIME_URL) {
        return process.env.V0_RUNTIME_URL
      }
      return 'http://localhost:3000'
    })(),
    trustedOrigins: (() => {
      const origins: string[] = []
      if (process.env.BETTER_AUTH_URL) origins.push(process.env.BETTER_AUTH_URL)
      if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
      }
      if (process.env.VERCEL_URL) {
        origins.push(`https://${process.env.VERCEL_URL}`)
      }
      if (process.env.V0_RUNTIME_URL) {
        origins.push(process.env.V0_RUNTIME_URL)
      }
      return origins
    })(),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    advanced: {
      defaultCookieAttributes:
        process.env.NODE_ENV === 'development'
          ? { sameSite: 'lax', secure: false }
          : undefined,
    },
  })

  return authInstance
}

export const auth = {
  get handler() {
    return initAuth().handler
  },
  get api() {
    return initAuth().api
  },
}
