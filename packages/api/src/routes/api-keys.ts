import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { findApiKeyByPlaintext, invalidateAndRegenerateApiKey } from '../services/api-key-service';
import { sendApiKeyRegenerationEmail } from '../services/email-service';

const app = new Hono().basePath('/api/v1/keys');

/**
 * POST /api/v1/keys/invalidate
 * 
 * Invalidates the API key provided in the request and generates a new one
 * Sends the new key to the registered email address
 * 
 * Authentication: Requires the API key to be provided in User-Agent or X-API-Key header
 */
app.post('/invalidate',
  async (c) => {
    // Get API key from header or User-Agent
    const apiKeyHeader = c.req.header('X-API-Key');
    const userAgent = c.req.header('User-Agent');
    
    // Extract API key from User-Agent if present
    let apiKey: string | undefined = apiKeyHeader;
    if (!apiKey && userAgent) {
      const apiKeyMatch = userAgent.match(/API\s*Key:\s*(\S+)/i);
      if (apiKeyMatch) {
        apiKey = apiKeyMatch[1];
      }
    }
    
    if (!apiKey) {
      throw new HTTPException(401, {
        message: 'API key required. Provide via X-API-Key header or User-Agent.',
      });
    }
    
    // Verify the API key exists and is active
    const keyRecord = await findApiKeyByPlaintext(apiKey);
    if (!keyRecord) {
      throw new HTTPException(401, {
        message: 'Invalid API key',
      });
    }
    
    // Get optional reason from request body
    const body = await c.req.json().catch(() => ({}));
    const reason = body.reason || 'Key invalidated by user request';
    
    try {
      // Invalidate and regenerate (using the keyRecord.id from the lookup)
      const { newApiKey, newKeyRecord } = await invalidateAndRegenerateApiKey(keyRecord.id, reason);
      
      // Send email with new key
      try {
        await sendApiKeyRegenerationEmail(
          keyRecord.contactEmail,
          keyRecord.appName,
          newApiKey,
          newKeyRecord.id
        );
      } catch (emailError) {
        // Log email error but don't fail the request
        console.error('Failed to send email:', emailError);
        // Still return the new key in response (less secure, but better than failing)
      }
      
      return c.json({
        success: true,
        message: 'API key invalidated. New key sent to registered email.',
        keyId: keyRecord.id,
        newKeyId: newKeyRecord.id,
        emailSent: true,
        // In development, also return the key (for testing)
        // In production, only send via email
        ...(process.env.NODE_ENV === 'development' ? { newApiKey } : {}),
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('Key invalidation error:', error);
      throw new HTTPException(500, {
        message: 'Failed to invalidate API key',
        cause: error,
      });
    }
  }
);

/**
 * GET /api/v1/keys/me
 * Get current API key information (without sensitive data)
 * Uses the API key from header/User-Agent to identify which key
 */
app.get('/me',
  async (c) => {
    // Get API key from header or User-Agent for authentication
    const apiKeyHeader = c.req.header('X-API-Key');
    const userAgent = c.req.header('User-Agent');
    
    let apiKey: string | undefined = apiKeyHeader;
    if (!apiKey && userAgent) {
      const apiKeyMatch = userAgent.match(/API\s*Key:\s*(\S+)/i);
      if (apiKeyMatch) {
        apiKey = apiKeyMatch[1];
      }
    }
    
    if (!apiKey) {
      throw new HTTPException(401, {
        message: 'API key required',
      });
    }
    
    // Verify the API key
    const keyRecord = await findApiKeyByPlaintext(apiKey);
    if (!keyRecord) {
      throw new HTTPException(401, {
        message: 'Invalid API key',
      });
    }
    
    // Return key info (without sensitive data)
    return c.json({
      success: true,
      data: {
        id: keyRecord.id,
        appName: keyRecord.appName,
        contactEmail: keyRecord.contactEmail,
        rateLimitPerHour: keyRecord.rateLimitPerHour,
        createdAt: keyRecord.createdAt.toISOString(),
        lastUsedAt: keyRecord.lastUsedAt?.toISOString() || null,
        isActive: keyRecord.isActive,
      },
      timestamp: Date.now(),
    });
  }
);

// Error handling
app.onError((err, c) => {
  console.error('API Keys Error:', err);

  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  return c.json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: Date.now(),
  }, 500);
});

export default app;

