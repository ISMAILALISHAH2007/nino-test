import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

let rawPool: Pool | undefined
let rawDb: ReturnType<typeof drizzle> | undefined

function initDb() {
  if (rawDb && rawPool) return { db: rawDb, pool: rawPool }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  if (process.env.NODE_ENV === 'production') {
    rawPool = new Pool({ connectionString, max: 10 })
    rawDb = drizzle(rawPool, { schema })
  } else {
    const globalForDb = globalThis as unknown as {
      pool: Pool | undefined
      db: ReturnType<typeof drizzle> | undefined
    }
    if (!globalForDb.pool) {
      globalForDb.pool = new Pool({ connectionString, max: 5 })
    }
    if (!globalForDb.db) {
      globalForDb.db = drizzle(globalForDb.pool, { schema })
    }
    rawPool = globalForDb.pool
    rawDb = globalForDb.db
  }

  return { db: rawDb, pool: rawPool }
}

export function getDb() {
  return initDb().db
}

export function getPool() {
  return initDb().pool
}

// Proxies to allow direct imports without throwing at build/load-time
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  }
})

export const pool = new Proxy({} as Pool, {
  get(target, prop, receiver) {
    const value = Reflect.get(getPool(), prop)
    if (typeof value === 'function') {
      return value.bind(getPool())
    }
    return value
  }
})

export default getDb

