import { pgTable, uuid, varchar, integer, timestamp, boolean, text } from 'drizzle-orm/pg-core';

/**
 * API Keys table
 * Stores API keys for enterprise tier rate limiting
 */
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyHash: varchar('key_hash', { length: 255 }).notNull().unique(),
  appName: varchar('app_name', { length: 100 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  rateLimitPerHour: integer('rate_limit_per_hour').notNull().default(1000),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
  isActive: boolean('is_active').notNull().default(true),
  invalidatedAt: timestamp('invalidated_at'),
  invalidationReason: text('invalidation_reason'),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

