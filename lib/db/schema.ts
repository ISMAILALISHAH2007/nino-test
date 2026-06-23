import { pgTable, text, timestamp, boolean, integer, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Better Auth tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: boolean('emailVerified').default(false),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
})

// Nino app tables
export const chatSession = pgTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
})

export const message = pgTable('messages', {
  id: text('id').primaryKey(),
  sessionId: text('sessionId').notNull().references(() => chatSession.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull(),
  role: text('role').notNull(), // 'user' or 'assistant'
  content: text('content').notNull(),
  sentiment: text('sentiment'), // 'positive', 'neutral', 'negative'
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
})

export const memory = pgTable('memories', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  importance: integer('importance').default(1),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userKeyIdx: uniqueIndex('memories_userId_key_idx').on(table.userId, table.key),
}))

export const userSettings = pgTable('user_settings', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().unique(),
  aiProvider: text('aiProvider').default('gemini'),
  apiKey: text('apiKey'),
  voiceEnabled: boolean('voiceEnabled').default(true),
  voiceLanguage: text('voiceLanguage').default('en-US'),
  theme: text('theme').default('dark'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
})

// Relations
export const chatSessionRelations = relations(chatSession, ({ many }) => ({
  messages: many(message),
}))

export const messageRelations = relations(message, ({ one }) => ({
  session: one(chatSession, {
    fields: [message.sessionId],
    references: [chatSession.id],
  }),
}))
