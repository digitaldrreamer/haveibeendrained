import { Context } from 'hono';
import { getRedisClient } from '../lib/redis';

/**
 * Cache middleware that checks for cached responses
 * Cached responses bypass rate limiting
 */
export function cacheMiddleware() {
  const redis = getRedisClient();
  const CACHE_TTL = 300; // 5 minutes

  return async (c: Context, next: () => Promise<void>) => {
    // Generate cache key from method and URL
    const cacheKey = `cache:${c.req.method}:${c.req.url}`;

    try {
      // Check for cached response
      const cached = await redis.get(cacheKey);

      if (cached) {
        // Mark in context that this is a cached response
        c.set('isCachedResponse', true);
        const cachedData = JSON.parse(cached);
        c.set('cachedData', cachedData);
        
        // Return cached response immediately (bypasses rate limiting)
        return c.json(cachedData);
      }
    } catch (error) {
      // If Redis fails, continue without cache
      console.warn('Cache check failed:', error);
    }

    // Continue to next middleware/handler
    await next();

    // After handler, cache successful responses
    try {
      if (c.res.status === 200) {
        // Clone response to read body without consuming it
        const clonedResponse = c.res.clone();
        const responseData = await clonedResponse.json();
        
        // Cache the response (setEx: set with expiration)
        await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(responseData));
      }
    } catch (error) {
      // If caching fails, log but don't fail the request
      console.warn('Cache write failed:', error);
    }
  };
}

