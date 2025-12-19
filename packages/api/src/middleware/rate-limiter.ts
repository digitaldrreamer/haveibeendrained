import { Context } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { RedisStore } from '@hono-rate-limiter/redis';
import { getRedisClient } from '../lib/redis';
import { RATE_LIMITS } from '../lib/rate-limit-config';
import { parseUserAgent, ParsedUserAgent } from './user-agent-parser';

/**
 * Get client IP address from request headers
 */
function getClientIP(c: Context): string {
  return c.req.header('CF-Connecting-IP') || 
         c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 
         c.req.header('X-Real-IP') ||
         'unknown';
}

/**
 * Create rate limit exceeded handler
 */
function createRateLimitHandler(c: Context) {
  const resetTime = c.req.header('RateLimit-Reset');
  const retryAfter = resetTime 
    ? Math.ceil((parseInt(resetTime) * 1000 - Date.now()) / 1000)
    : 3600; // Default 1 hour

  return c.json({
    success: false,
    error: 'Rate limit exceeded',
    message: 'You have exceeded the rate limit for this endpoint. Please try again later.',
    retryAfter,
    limit: c.req.header('RateLimit-Limit'),
    remaining: c.req.header('RateLimit-Remaining'),
  }, 429, {
    'Retry-After': retryAfter.toString(),
  });
}

/**
 * Create rate limiter middleware for public API
 * Tracks rate limits per User-Agent AND per IP address
 * Cached responses bypass rate limiting (checked in cache middleware)
 * Uses tier-based limiters for different rate limit configurations
 */
export function createPublicApiRateLimiter() {
  const redis = getRedisClient();

  // Create limiters for each tier
  const unregisteredLimiter = rateLimiter({
    windowMs: RATE_LIMITS.UNREGISTERED.windowMs,
    limit: RATE_LIMITS.UNREGISTERED.limit,
    standardHeaders: 'draft-6',
    store: new RedisStore({
      client: redis,
      prefix: 'rl:public-api:unregistered:',
    }),
    keyGenerator: (c: Context) => {
      const ip = getClientIP(c);
      return `ip:${ip}`;
    },
    handler: createRateLimitHandler,
    skip: (c: Context) => c.get('isCachedResponse') === true,
  });

  const registeredLimiter = rateLimiter({
    windowMs: RATE_LIMITS.REGISTERED.windowMs,
    limit: RATE_LIMITS.REGISTERED.limit,
    standardHeaders: 'draft-6',
    store: new RedisStore({
      client: redis,
      prefix: 'rl:public-api:registered:',
    }),
    keyGenerator: (c: Context) => {
      const parsed = c.get('parsedUserAgent') as ParsedUserAgent;
      const ip = getClientIP(c);
      return `ip:${ip}:app:${parsed.appName}`;
    },
    handler: createRateLimitHandler,
    skip: (c: Context) => c.get('isCachedResponse') === true,
  });

  const enterpriseLimiter = rateLimiter({
    windowMs: RATE_LIMITS.ENTERPRISE.windowMs,
    limit: RATE_LIMITS.ENTERPRISE.limit,
    standardHeaders: 'draft-6',
    store: new RedisStore({
      client: redis,
      prefix: 'rl:public-api:enterprise:',
    }),
    keyGenerator: (c: Context) => {
      const parsed = c.get('parsedUserAgent') as ParsedUserAgent;
      return `key:${parsed.apiKey}`;
    },
    handler: createRateLimitHandler,
    skip: (c: Context) => c.get('isCachedResponse') === true,
  });

  // Return middleware that selects the appropriate limiter based on tier
  return async (c: Context, next: () => Promise<void>) => {
    // Skip rate limiting for cached responses
    if (c.get('isCachedResponse')) {
      return next();
    }

    // Get parsed user agent from context (set by userAgentParser middleware)
    const parsed = c.get('parsedUserAgent') as ParsedUserAgent;

    // Select limiter based on tier
    let limiter;
    switch (parsed.tier) {
      case 'enterprise':
        limiter = enterpriseLimiter;
        break;
      case 'registered':
        limiter = registeredLimiter;
        break;
      case 'unregistered':
      default:
        limiter = unregisteredLimiter;
        break;
    }

    // Apply the selected limiter
    return limiter(c, next);
  };
}

