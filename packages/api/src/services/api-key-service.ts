import { eq, and } from 'drizzle-orm';
import { db } from '../lib/db';
import { apiKeys, type ApiKey, type NewApiKey } from '../lib/schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Re-export types for convenience
export type { ApiKey, NewApiKey } from '../lib/schema';

/**
 * Generate a new API key
 * Returns the plaintext key (only shown once) and the hash for storage
 */
export function generateApiKey(): { key: string; hash: string } {
  // Generate a secure random key (32 bytes = 256 bits)
  const key = `hibd_${crypto.randomBytes(32).toString('base64url')}`;
  // Hash the key for storage (using bcrypt for security)
  const hash = bcrypt.hashSync(key, 10);
  return { key, hash };
}

/**
 * Verify an API key against a hash
 */
export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

/**
 * Create a new API key in the database
 */
export async function createApiKey(data: {
  appName: string;
  contactEmail: string;
  rateLimitPerHour?: number;
}): Promise<{ apiKey: string; keyRecord: ApiKey }> {
  const { key, hash } = generateApiKey();
  
  const newKey: NewApiKey = {
    keyHash: hash,
    appName: data.appName,
    contactEmail: data.contactEmail,
    rateLimitPerHour: data.rateLimitPerHour || 1000,
    isActive: true,
  };

  const [keyRecord] = await db.insert(apiKeys).values(newKey).returning();

  return {
    apiKey: key, // Return plaintext key (only time it's available)
    keyRecord,
  };
}

/**
 * Find API key by hash (for validation)
 */
export async function findApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(
      eq(apiKeys.keyHash, keyHash),
      eq(apiKeys.isActive, true)
    ))
    .limit(1);

  return key || null;
}

/**
 * Find API key by plaintext key (for validation)
 * This checks all active keys by comparing hashes
 */
export async function findApiKeyByPlaintext(key: string): Promise<ApiKey | null> {
  // Get all active keys (in production, you'd want to index this better)
  const allKeys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.isActive, true));

  // Check each key's hash
  for (const keyRecord of allKeys) {
    const isValid = await verifyApiKey(key, keyRecord.keyHash);
    if (isValid) {
      // Update last used timestamp
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, keyRecord.id));
      
      return keyRecord;
    }
  }

  return null;
}

/**
 * Invalidate an API key and generate a new one
 */
export async function invalidateAndRegenerateApiKey(
  keyId: string,
  reason?: string
): Promise<{ newApiKey: string; newKeyRecord: ApiKey }> {
  // Get the old key record
  const [oldKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1);

  if (!oldKey) {
    throw new Error('API key not found');
  }

  // Invalidate the old key
  await db
    .update(apiKeys)
    .set({
      isActive: false,
      invalidatedAt: new Date(),
      invalidationReason: reason || 'Key invalidated and regenerated',
    })
    .where(eq(apiKeys.id, keyId));

  // Generate a new key with the same app details
  const { apiKey, keyRecord } = await createApiKey({
    appName: oldKey.appName,
    contactEmail: oldKey.contactEmail,
    rateLimitPerHour: oldKey.rateLimitPerHour,
  });

  return {
    newApiKey: apiKey,
    newKeyRecord: keyRecord,
  };
}

/**
 * Get API key by ID
 */
export async function getApiKeyById(keyId: string): Promise<ApiKey | null> {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1);

  return key || null;
}

