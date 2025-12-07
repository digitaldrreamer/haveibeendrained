# Rate Limiting Implementation Reference Guide
**Have I Been Drained - Quick Integration Guide (December 2025)**

---

## PART 1: MINIMAL PRODUCTION SETUP (Copy-Paste Ready)

### Step 1: Install Dependencies

```bash
npm install hono-rate-limiter @hono-rate-limiter/redis @upstash/redis
npm install -D typescript @types/node
```

### Step 2: Environment Variables

```bash
# .env
UPSTASH_REDIS_REST_URL=https://your-project.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
API_PORT=3000
```

### Step 3: Core Rate Limiter Module

**File: `src/lib/rate-limiter.ts`**

```typescript
import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { RedisStore } from '@hono-rate-limiter/redis';
import { Redis } from '@upstash/redis/cloudflare';

// Initialize Redis once
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export type RateLimitConfig = {
  windowMs: number;
  limit: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
};

// Pre-configured limits
export const RATE_LIMITS = {
  STRICT: { windowMs: 60000, limit: 10 },      // 10/min
  MODERATE: { windowMs: 60000, limit: 30 },    // 30/min
  GENEROUS: { windowMs: 60000, limit: 100 },   // 100/min
  REPORT: { windowMs: 3600000, limit: 5 },     // 5/hour
  ANON: { windowMs: 60000, limit: 5 },         // 5/min
} as const;

export function createRateLimiter(config: RateLimitConfig) {
  return rateLimiter({
    ...config,
    standardHeaders: 'draft-6',
    keyGenerator: (c) => {
      // Prefer authenticated user > API key > IP
      const userId = c.get('userId');
      if (userId) return `user:${userId}`;
      
      const apiKey = c.req.header('X-API-Key');
      if (apiKey) return `key:${apiKey}`;
      
      return `ip:${c.req.header('cf-connecting-ip') || 'unknown'}`;
    },
    store: new RedisStore({
      client: redis,
      prefix: 'ratelimit:',
      resetExpiryOnChange: false,
    }),
    handler: (c) => {
      const retryAfter = Math.ceil(
        (parseInt(c.req.header('RateLimit-Reset') || '0') * 1000 - Date.now()) / 1000
      );
      
      return c.json(
        {
          error: 'Too Many Requests',
          message: 'You have exceeded the rate limit. Please try again later.',
          retryAfter: Math.max(1, retryAfter),
        },
        429,
        {
          'Retry-After': Math.max(1, retryAfter).toString(),
        }
      );
    },
  });
}

// Convenience middleware
export const limiters = {
  STRICT: createRateLimiter(RATE_LIMITS.STRICT),
  MODERATE: createRateLimiter(RATE_LIMITS.MODERATE),
  GENEROUS: createRateLimiter(RATE_LIMITS.GENEROUS),
  REPORT: createRateLimiter(RATE_LIMITS.REPORT),
  ANON: createRateLimiter(RATE_LIMITS.ANON),
};
```

### Step 4: CAPTCHA Verification Module

**File: `src/lib/captcha.ts`**

```typescript
export async function verifyTurnstile(token: string): Promise<{
  success: boolean;
  challengeTs?: string;
  hostname?: string;
  errorCodes?: string[];
}> {
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    }
  );

  if (!response.ok) {
    // Fail open if Turnstile is down
    console.error('Turnstile API error:', response.status);
    return { success: true };
  }

  return response.json();
}

// Middleware to require CAPTCHA
export const requireCaptcha = async (c, next) => {
  const body = await c.req.json().catch(() => ({}));
  const token = body['cf-turnstile-response'];

  if (!token) {
    return c.json(
      { error: 'CAPTCHA token is required' },
      400
    );
  }

  const result = await verifyTurnstile(token);

  if (!result.success) {
    return c.json(
      { 
        error: 'CAPTCHA verification failed',
        errors: result.errorCodes 
      },
      403
    );
  }

  return next();
};
```

### Step 5: Main API Setup

**File: `src/index.ts`**

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { limiters, createRateLimiter, RATE_LIMITS } from './lib/rate-limiter';
import { requireCaptcha } from './lib/captcha';

const app = new Hono();

// Global middleware
app.use(cors());

// Apply different rate limits to routes
app.get('/api/health', limiters.GENEROUS, (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Wallet analysis - moderate limits
app.get(
  '/api/v1/wallets/:address',
  limiters.MODERATE,
  async (c) => {
    const address = c.req.param('address');
    // Analyze wallet...
    return c.json({ address, status: 'analyzed' });
  }
);

// Expensive historical data - strict limits
app.get(
  '/api/v1/wallets/:address/transactions',
  limiters.STRICT,
  async (c) => {
    const address = c.req.param('address');
    // Fetch transactions...
    return c.json({ address, transactions: [] });
  }
);

// Report drain - requires CAPTCHA + very strict limits
app.post(
  '/api/v1/drains/report',
  limiters.REPORT,
  requireCaptcha,
  async (c) => {
    const body = await c.req.json();
    // Save drain report...
    return c.json({ id: 'drain-123', status: 'submitted' }, 201);
  }
);

// Export for Cloudflare Workers
export default app;
```

---

## PART 2: ADVANCED PATTERNS

### Custom Per-User Tier Limiting

```typescript
// src/lib/tier-limiter.ts

type UserTier = 'anonymous' | 'free' | 'pro' | 'enterprise';

const TIER_LIMITS = {
  anonymous: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    dailyLimit: 500,
  },
  free: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    dailyLimit: 10000,
  },
  pro: {
    requestsPerMinute: 500,
    requestsPerHour: 10000,
    dailyLimit: 100000,
  },
  enterprise: {
    requestsPerMinute: 5000,
    requestsPerHour: 100000,
    dailyLimit: 1000000,
  },
};

export async function getUserTier(c): Promise<UserTier> {
  // Check for API key
  const apiKey = c.req.header('X-API-Key');
  if (apiKey) {
    const user = await db.users.findByApiKey(apiKey);
    if (!user) return 'anonymous';
    
    const tierMap = {
      'pro': 'pro',
      'enterprise': 'enterprise',
      default: 'free',
    };
    return tierMap[user.tier] || tierMap.default;
  }

  // Check for auth token
  const auth = c.req.header('Authorization');
  if (auth) {
    try {
      const userId = await verifyAuth(auth);
      const user = await db.users.findById(userId);
      
      const tierMap = {
        'pro': 'pro',
        'enterprise': 'enterprise',
        default: 'free',
      };
      return tierMap[user.tier] || tierMap.default;
    } catch {
      return 'anonymous';
    }
  }

  return 'anonymous';
}

export function createTierLimiter() {
  return async (c, next) => {
    const tier = await getUserTier(c);
    const limits = TIER_LIMITS[tier];
    
    // Create a custom rate limiter for this tier
    const limiter = createRateLimiter({
      windowMs: 60000,
      limit: limits.requestsPerMinute,
    });

    c.set('userTier', tier);
    c.set('tierLimits', limits);

    return limiter(c, next);
  };
}
```

**Usage:**
```typescript
const tierLimiter = createTierLimiter();
app.use(tierLimiter);

app.get('/api/v1/premium-data', async (c) => {
  const tier = c.get('userTier');
  if (tier === 'anonymous') {
    return c.json(
      { error: 'Authentication required for premium data' },
      401
    );
  }
  // Return premium data
});
```

### Dynamic CAPTCHA Triggering

```typescript
// src/lib/suspicious-activity.ts

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function shouldRequireCaptcha(c): Promise<boolean> {
  const ip = c.req.header('cf-connecting-ip');
  const userId = c.get('userId');

  // Always require for anonymous users making sensitive requests
  if (!userId) {
    const endpoint = new URL(c.req.url).pathname;
    if (['/api/drains', '/api/report'].some(p => endpoint.includes(p))) {
      return true;
    }
  }

  // Check for rapid requests from IP
  const key = `suspicious:${ip}:count`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60);
  }

  if (count > 50) {
    return true;
  }

  // Check account age (new accounts are suspicious)
  if (userId) {
    const user = await db.users.findById(userId);
    const ageMinutes = (Date.now() - user.createdAt.getTime()) / (1000 * 60);
    if (ageMinutes < 30) {
      return true;
    }
  }

  return false;
}

export const conditionalCaptcha = async (c, next) => {
  if (await shouldRequireCaptcha(c)) {
    const body = await c.req.json();
    const token = body['cf-turnstile-response'];

    if (!token) {
      return c.json(
        { 
          error: 'CAPTCHA required',
          requiresCaptcha: true 
        },
        403
      );
    }

    const result = await verifyTurnstile(token);
    if (!result.success) {
      return c.json(
        { error: 'CAPTCHA verification failed' },
        403
      );
    }
  }

  return next();
};
```

### Monitoring & Alerts

```typescript
// src/lib/monitoring.ts

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function logRequest(
  userId: string | null,
  endpoint: string,
  statusCode: number
): Promise<void> {
  const timestamp = new Date().toISOString();
  const dateKey = timestamp.split('T')[0];

  // Track daily usage per user
  if (userId) {
    await redis.incr(`usage:${userId}:${dateKey}`);
  }

  // Track endpoint popularity
  await redis.incr(`endpoint:${endpoint}:${dateKey}`);

  // Track error rates
  if (statusCode >= 400) {
    await redis.incr(`errors:${endpoint}:${dateKey}`);
  }
}

export async function checkAnomalies(): Promise<void> {
  // Check for users approaching limits
  const users = await redis.keys('usage:*');

  for (const key of users) {
    const usage = parseInt(await redis.get(key));
    const limit = 10000; // Example daily limit

    if (usage > limit * 0.9) {
      const userId = key.split(':')[1];
      const percentUsed = (usage / limit) * 100;

      console.warn(
        `User ${userId} at ${percentUsed.toFixed(1)}% of daily limit`
      );

      if (usage > limit * 0.95) {
        // Send alert email
        await sendAlert(
          userId,
          `You are using 95% of your daily API limit`
        );
      }
    }
  }
}

// Run checks periodically
setInterval(checkAnomalies, 60000); // Every minute
```

---

## PART 3: DATABASE SCHEMA

### PostgreSQL Schema for Rate Limiting

```sql
-- API Keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  tier VARCHAR(50) NOT NULL DEFAULT 'free',
  requests_per_minute INTEGER NOT NULL DEFAULT 60,
  requests_per_hour INTEGER NOT NULL DEFAULT 1000,
  requests_per_day INTEGER NOT NULL DEFAULT 10000,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_active ON api_keys(active);

-- Whitelist table (for trusted IPs/users)
CREATE TABLE rate_limit_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- 'ip', 'user', 'api-key'
  value VARCHAR(255) NOT NULL,
  reason TEXT,
  unlimited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(type, value)
);

-- Rate limit events (for monitoring)
CREATE TABLE rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_events_client ON rate_limit_events(client_id);
CREATE INDEX idx_rate_limit_events_endpoint ON rate_limit_events(endpoint);
CREATE INDEX idx_rate_limit_events_created ON rate_limit_events(created_at);
```

---

## PART 4: TESTING

### Rate Limiter Test Suite

**File: `src/__tests__/rate-limiter.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { limiters } from '../lib/rate-limiter';

describe('Rate Limiter', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use(limiters.STRICT);
    app.get('/test', (c) => c.json({ ok: true }));
  });

  it('should allow requests within limit', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await app.request(new Request('http://localhost/test'));
      expect(res.status).toBe(200);
    }
  });

  it('should reject requests exceeding limit', async () => {
    // Make 10 requests (at limit)
    for (let i = 0; i < 10; i++) {
      await app.request(new Request('http://localhost/test'));
    }

    // 11th request should be rejected
    const res = await app.request(new Request('http://localhost/test'));
    expect(res.status).toBe(429);

    const body = await res.json();
    expect(body.error).toBe('Too Many Requests');
    expect(body.retryAfter).toBeGreaterThan(0);
  });

  it('should include RateLimit headers', async () => {
    const res = await app.request(new Request('http://localhost/test'));

    expect(res.headers.has('RateLimit-Limit')).toBe(true);
    expect(res.headers.has('RateLimit-Remaining')).toBe(true);
    expect(res.headers.has('RateLimit-Reset')).toBe(true);
  });

  it('should include Retry-After on 429', async () => {
    for (let i = 0; i < 10; i++) {
      await app.request(new Request('http://localhost/test'));
    }

    const res = await app.request(new Request('http://localhost/test'));
    expect(res.status).toBe(429);
    expect(res.headers.has('Retry-After')).toBe(true);
  });
});
```

---

## PART 5: CONFIGURATION FOR DIFFERENT ENVIRONMENTS

### Development (Minimal Rate Limiting)

```typescript
// config.development.ts
export const RATE_LIMIT_CONFIG = {
  ENDPOINT_LIMITS: {
    strict: { windowMs: 60000, limit: 100 },
    moderate: { windowMs: 60000, limit: 500 },
    generous: { windowMs: 60000, limit: 2000 },
  },
  ENABLE_CAPTCHA: false,
  REDIS_ENABLED: false,
  USE_MEMORY_STORE: true,
};
```

### Production (Strict Rate Limiting)

```typescript
// config.production.ts
export const RATE_LIMIT_CONFIG = {
  ENDPOINT_LIMITS: {
    strict: { windowMs: 60000, limit: 10 },
    moderate: { windowMs: 60000, limit: 30 },
    generous: { windowMs: 60000, limit: 100 },
  },
  ENABLE_CAPTCHA: true,
  REDIS_ENABLED: true,
  USE_MEMORY_STORE: false,
  MONITOR_SUSPICIOUS_ACTIVITY: true,
};
```

---

## DEPLOYMENT CHECKLIST

- [ ] Redis instance created (Upstash recommended)
- [ ] Environment variables configured
- [ ] Rate limiting middleware integrated
- [ ] CAPTCHA integration tested
- [ ] Error responses validated (429 status + headers)
- [ ] Rate limit headers confirmed in responses
- [ ] Whitelisting for internal services configured
- [ ] API key system deployed
- [ ] Monitoring queries working
- [ ] Load testing completed (verify limits work at scale)
- [ ] Documentation updated for API consumers
- [ ] Alert system configured for high usage
- [ ] Cloudflare WAF rules configured (if Pro+)

---

## COST ESTIMATION

**December 2025 Pricing:**

| Service | Free Tier | Pro Tier | Notes |
|---------|-----------|---------|-------|
| **Upstash Redis** | 10,000 commands/day | $0.20 per 100k commands | Generous free tier |
| **Cloudflare Turnstile** | 1M assessments/month | Included in plan | Free or low-cost |
| **Hono + Workers** | 100,000 requests/day | $0.15 per million | Runs on free tier Workers |
| **PostgreSQL** | Self-hosted or free tier | Varies | AWS RDS free tier available |

**Estimated Total Cost (Small Scale):**
- Dev/Test: **$0/month** (all free tiers)
- Production (100k requests/day): **$10-20/month**

---

## TROUBLESHOOTING

### Redis Connection Issues

```typescript
// Add retry logic
const MAX_RETRIES = 3;
let retries = 0;

async function initRedis() {
  try {
    await redis.ping();
    console.log('✅ Redis connected');
  } catch (error) {
    if (retries < MAX_RETRIES) {
      retries++;
      console.warn(`Redis connection failed. Retry ${retries}/${MAX_RETRIES}`);
      setTimeout(initRedis, 1000 * retries);
    } else {
      console.error('❌ Redis connection failed. Using in-memory fallback.');
      // Fall back to in-memory rate limiting
    }
  }
}
```

### Rate Limit False Positives

```typescript
// Increase limits if needed
const PROD_LIMITS = {
  STRICT: { windowMs: 60000, limit: 20 },     // Increased from 10
  MODERATE: { windowMs: 60000, limit: 60 },   // Increased from 30
  GENEROUS: { windowMs: 60000, limit: 200 },  // Increased from 100
};

// Add bypass for specific users
app.use(async (c, next) => {
  const userId = c.get('userId');
  const whitelisted = await db.whitelist.findOne({ userId });
  
  if (whitelisted?.unlimited) {
    c.set('bypassRateLimit', true);
  }
  
  return next();
});
```

---

## REFERENCES

- [hono-rate-limiter](https://github.com/rhinobase/hono-rate-limiter)
- [Upstash Redis SDK](https://github.com/upstash/redis-js)
- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [HTTP RateLimit Headers](https://tools.ietf.org/html/draft-ietf-httpapi-ratelimit-headers)

---

**Last Updated:** December 2025
**Framework:** Hono 4.x
**Runtime:** Node.js 18+, Cloudflare Workers
**Database:** PostgreSQL 13+