import { createClient, RedisClientType } from 'redis';

/**
 * Initialize Redis client for docker-compose internal network
 * Connection uses docker-compose service name 'redis' for internal network
 * Uses node-redis v5 (compatible with @hono-rate-limiter/redis)
 */
export function createRedisClient(): RedisClientType {
  const redis = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'redis', // docker-compose service name
      port: parseInt(process.env.REDIS_PORT || '6379'),
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: Too many reconnection attempts, giving up');
          return new Error('Too many reconnection attempts');
        }
        const delay = Math.min(retries * 50, 2000);
        return delay;
      },
    },
    // No password for internal network
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  redis.on('connect', () => {
    console.log('✅ Redis connecting...');
  });

  redis.on('ready', () => {
    console.log('✅ Redis ready');
  });

  // Connect to Redis (non-blocking)
  redis.connect().catch((err) => {
    console.error('Failed to connect to Redis:', err);
  });

  return redis;
}

// Singleton instance
let redisInstance: RedisClientType | null = null;

export function getRedisClient(): RedisClientType {
  if (!redisInstance) {
    redisInstance = createRedisClient();
  }
  return redisInstance;
}

