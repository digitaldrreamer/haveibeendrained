import { pgTable, uuid, varchar, integer, timestamp, boolean, text, index } from 'drizzle-orm/pg-core';

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

/**
 * Wallet Alerts table
 * Stores wallet addresses and associated email addresses for drain notifications
 * Multiple emails per wallet address are allowed (emails not unique)
 */
export const walletAlerts = pgTable(
  'wallet_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletAddress: varchar('wallet_address', { length: 44 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    verified: boolean('verified').notNull().default(false),
    verificationToken: varchar('verification_token', { length: 255 }),
    verificationTokenExpiresAt: timestamp('verification_token_expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    walletAddressIdx: index('idx_wallet_alerts_wallet_address').on(table.walletAddress),
    verificationTokenIdx: index('idx_wallet_alerts_verification_token').on(table.verificationToken),
  })
);

export type WalletAlert = typeof walletAlerts.$inferSelect;
export type NewWalletAlert = typeof walletAlerts.$inferInsert;

/**
 * Nonces table
 * Stores nonces for signature verification with expiration
 */
export const nonces = pgTable(
  'nonces',
  {
    nonce: varchar('nonce', { length: 255 }).primaryKey(),
    walletAddress: varchar('wallet_address', { length: 44 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    walletAddressExpiresAtIdx: index('idx_nonces_wallet_address_expires_at').on(
      table.walletAddress,
      table.expiresAt
    ),
  })
);

export type Nonce = typeof nonces.$inferSelect;
export type NewNonce = typeof nonces.$inferInsert;

