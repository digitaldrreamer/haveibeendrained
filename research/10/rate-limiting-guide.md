# Rate Limiting & Anti-Spam Strategies for "Have I Been Drained"

**Context:** Solana wallet security checker with Hono API backend, PostgreSQL database, and Cloudflare integration.

---

## TABLE OF CONTENTS

1. [Rate Limiting Algorithms](#rate-limiting-algorithms)
2. [Implementation for Hono](#implementation-for-hono)
3. [Dimensioned Rate Limiting](#dimensioned-rate-limiting)
4. [HTTP Response Handling](#http-response-handling)
5. [CAPTCHA Integration](#captcha-integration)
6. [Cloudflare Features](#cloudflare-features)
7. [Solana-Specific Considerations](#solana-specific-considerations)
8. [Recommended Limits](#recommended-limits)
9. [Handling High-Volume Legitimate Users](#handling-high-volume-legitimate-users)

---

## RATE LIMITING ALGORITHMS

### 1. Token Bucket Algorithm

**How It Works:**
- A "bucket" holds tokens at fixed capacity (e.g., 100 tokens)
- Tokens are added at constant rate (e.g., 10 tokens/second)
- Each request consumes 1 token
- If bucket has tokens → request allowed; if empty → rejected
- Tokens accumulate when traffic is low, enabling burst handling

**Pros:**
✅ Highly flexible, allows temporary bursts  
✅ Can handle sudden spikes in traffic  
✅ Simple to understand and implement  
✅ Works well for APIs with variable traffic patterns  

**Cons:**
❌ Token management overhead  
❌ Susceptible to exploitation if not configured properly  
❌ Requires careful tuning of token refill rate  

**Best For:** APIs that experience occasional traffic spikes, social media APIs, general web services.

---

### 2. Leaky Bucket Algorithm

**How It Works:**
- Requests enter a bucket (queue)
- Bucket has fixed capacity; overflow rejected
- Requests "leak" out (are processed) at constant, fixed rate
- Smooths bursty traffic into steady flow

**Pros:**
✅ Predictable, constant output rate  
✅ Excellent for smoothing traffic  
✅ Protects against large traffic bursts  
✅ Prevents system overload  

**Cons:**
❌ Less flexible, doesn't allow bursts  
❌ Can't adapt to dynamic traffic patterns  
❌ May cause delays for legitimate users  

**Best For:** Systems requiring steady, predictable throughput like payment processing or critical blockchain operations.

---

### 3. Fixed Window Counter (Deprecated)

**How It Works:**
- Requests counted within fixed time windows (e.g., 1-minute windows)
- Window resets at each interval boundary
- Once limit reached, reject all further requests in that window

**Problems:**
❌ **Boundary spike issue:** User can burst at end of one window + start of next (2x rate!)  
❌ Not recommended for production use  

---

### 4. Sliding Window Log (High-Memory)

**How It Works:**
- Store timestamp for every request
- On new request, remove expired timestamps
- If remaining timestamps > limit → reject

**Pros:**
✅ Very accurate rate limiting  

**Cons:**
❌ Memory-intensive for high-traffic APIs  
❌ Not scalable for distributed systems  

**Best For:** Low-traffic systems, single-server deployments.

---

### 5. Sliding Window Counter (Recommended ⭐)

**How It Works:**
- Hybrid of fixed window + sliding window
- Divide time into smaller windows
- Calculate weighted average across windows
- More accurate than fixed window, less memory than sliding log

**Pros:**
✅ Accurate rate limiting  
✅ Memory-efficient  
✅ Prevents boundary spike issue  
✅ Scalable to distributed systems  

**Cons:**
❌ Slightly more complex to implement  

**Best For:** Production APIs, especially distributed systems. **RECOMMENDED FOR "HAVE I BEEN DRAINED".**

---

### 6. GCRA (Generic Cell Rate Algorithm)

**How It Works (Advanced):**
- Tracks "Theoretical Arrival Time" (TAT)
- New TAT = previous TAT + emission interval (T)
- Allows one emission interval drift for burst capacity
- Highly efficient for Redis implementation

**Pros:**
✅ Very efficient Redis implementation  
✅ Supports both rate limiting and burst capacity  
✅ Production-grade algorithm  

**Use Case:** High-performance distributed rate limiting.

---

## IMPLEMENTATION FOR HONO

### Option 1: Using `hono-rate-limiter` (Recommended)

**Installation:**
```bash
npm install hono-rate-limiter
npm install @hono-rate-limiter/redis  # For distributed rate limiting
```

**Basic In-Memory Example:**
```typescript
import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';

const app = new Hono();

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,        // 15-minute window
  limit: 100,                        // 100 requests per window
  standardHeaders: 'draft-6',        // Include RateLimit headers
  skip: (c) => {
    // Skip rate limiting for authenticated users
    return c.req.header('Authorization') !== undefined;
  },
  keyGenerator: (c) => {
    // Use authenticated user ID, fallback to IP
    const userId = c.get('userId');
    return userId || c.req.header('cf-connecting-ip') || 'anonymous';
  },
  handler: (c) => {
    return c.json(
      {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: c.req.header('Retry-After')
      },
      429
    );
  }
});

app.use(limiter);

app.get('/api/check-wallet', (c) => {
  return c.json({ status: 'ok', address: '...' });
});
```

---

### Option 2: Redis-Based Distributed Rate Limiting

**Installation:**
```bash
npm install @hono-rate-limiter/redis @upstash/redis
```

**Implementation with Upstash Redis (free tier, serverless):**
```typescript
import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { RedisStore } from '@hono-rate-limiter/redis';
import { Redis } from '@upstash/redis/cloudflare';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const app = new Hono();

// Distributed rate limiter using Redis
const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => {
    const userId = c.get('userId');
    return userId || c.req.header('cf-connecting-ip') || 'anonymous';
  },
  store: new RedisStore({
    client: redis,
    prefix: 'rl:', // Rate limit key prefix
    resetExpiryOnChange: false
  }),
  handler: (c) => {
    return c.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again in 15 minutes.',
        retryAfter: Math.ceil((c.req.header('RateLimit-Reset') || Date.now()) / 1000)
      },
      429
    );
  }
});

app.use(limiter);
```

---

### Option 3: Custom Redis Implementation with Lua Script

**Why Lua Scripts?** Ensures atomic operations, preventing race conditions in distributed systems.

```typescript
import { Hono } from 'hono';
import { Redis } from '@upstash/redis/cloudflare';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Lua script for atomic rate limiting (GCRA algorithm)
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current_time = tonumber(ARGV[3])

-- Get current count
local current = redis.call('GET', key)
if current == false then
  -- First request
  redis.call('SET', key, 1)
  redis.call('EXPIRE', key, window)
  return {1, limit, window}
else
  local count = tonumber(current)
  if count < limit then
    redis.call('INCR', key)
    local ttl = redis.call('TTL', key)
    return {count + 1, limit, ttl}
  else
    local ttl = redis.call('TTL', key)
    return {count, limit, ttl}
  end
end
`;

async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  try {
    const scriptSha = await redis.scriptLoad(RATE_LIMIT_SCRIPT);
    const [count, limiter, ttl] = await redis.evalsha<[number, number, number]>(
      scriptSha,
      [key],
      [limit, windowMs / 1000, Date.now()]
    );

    return {
      allowed: count < limit,
      remaining: Math.max(0, limit - count),
      resetIn: Math.max(0, ttl)
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open on Redis errors
    return { allowed: true, remaining: limit, resetIn: 0 };
  }
}

// Hono middleware using custom rate limiter
const customRateLimitMiddleware = (limit: number, windowMs: number) => {
  return async (c: HonoRequest, next: Function) => {
    const key = c.req.header('cf-connecting-ip') || 'anonymous';
    const result = await checkRateLimit(`rl:${key}`, limit, windowMs);

    // Set response headers
    c.res.headers.set('X-RateLimit-Limit', limit.toString());
    c.res.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    c.res.headers.set('X-RateLimit-Reset', (Math.floor(Date.now() / 1000) + result.resetIn).toString());

    if (!result.allowed) {
      return c.json(
        { error: 'Rate limit exceeded', retryAfter: result.resetIn },
        429
      );
    }

    await next();
  };
};

const app = new Hono();
app.use(customRateLimitMiddleware(100, 15 * 60 * 1000));
```

---

### Trade-offs: In-Memory vs Distributed

| Aspect | In-Memory | Distributed (Redis) |
|--------|-----------|-------------------|
| **Latency** | Ultra-low (<1ms) | Higher (~10-50ms) |
| **Scalability** | Single server only | Scales to many servers |
| **Data Loss** | Lost on restart | Persistent |
| **Cost** | Free | Free tier available (Upstash) |
| **Complexity** | Simple | Moderate |
| **Best For** | Development, low-traffic | Production, distributed systems |

**Recommendation for "Have I Been Drained":**
- **Development:** In-memory (hono-rate-limiter)
- **Production:** Redis with Upstash (free tier supports ~10,000 req/day)

---

## DIMENSIONED RATE LIMITING

### Different Limits for Different Scenarios

**Tier-based approach:**

```typescript
import { Hono } from 'hono';

type UserTier = 'anonymous' | 'free' | 'pro' | 'api-key';

const LIMITS = {
  anonymous: { requestsPerMinute: 10, requestsPerHour: 100 },
  free: { requestsPerMinute: 60, requestsPerHour: 1000 },
  pro: { requestsPerMinute: 500, requestsPerHour: 10000 },
  'api-key': { requestsPerMinute: 1000, requestsPerHour: 100000 }
};

async function getUserTier(c: HonoRequest): Promise<UserTier> {
  // Check authentication
  const apiKey = c.req.header('X-API-Key');
  if (apiKey) {
    const user = await db.users.findByApiKey(apiKey);
    if (user?.isPro) return 'pro';
    return 'api-key';
  }

  // Check JWT/cookies
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    try {
      const payload = await verifyJWT(authHeader);
      return payload.tier || 'free';
    } catch {
      return 'anonymous';
    }
  }

  return 'anonymous';
}

// Per-endpoint rate limiting
const app = new Hono();

app.get('/api/check-wallet', rateLimitByTier(async (c) => {
  const tier = await getUserTier(c);
  return LIMITS[tier];
}));

app.get('/api/historical-data', rateLimitByTier(async (c) => {
  const tier = await getUserTier(c);
  // Stricter limits for expensive endpoints
  return {
    requestsPerMinute: LIMITS[tier].requestsPerMinute * 0.5,
    requestsPerHour: LIMITS[tier].requestsPerHour * 0.5
  };
}));

app.post('/api/report-drain', rateLimitByTier(async (c) => {
  const tier = await getUserTier(c);
  // Even stricter for creation endpoints (prevent spam)
  return {
    requestsPerMinute: Math.min(LIMITS[tier].requestsPerMinute / 10, 5),
    requestsPerHour: Math.min(LIMITS[tier].requestsPerHour / 10, 100)
  };
}));
```

---

### Handling NAT & Shared IPs

**Problem:** Users behind NAT or corporate proxies all appear as same IP.

**Solutions:**

```typescript
function getClientIdentifier(c: HonoRequest): string {
  // Priority order for client identification:
  
  // 1. Authenticated user ID (most reliable)
  const userId = c.get('userId');
  if (userId) return `user:${userId}`;

  // 2. API Key (for programmatic access)
  const apiKey = c.req.header('X-API-Key');
  if (apiKey) return `api:${apiKey}`;

  // 3. Cloudflare client IP (more accurate than X-Forwarded-For)
  const cfClientIp = c.req.header('CF-Connecting-IP');
  if (cfClientIp) return `ip:${cfClientIp}`;

  // 4. X-Forwarded-For (last IP in chain)
  const forwarded = c.req.header('X-Forwarded-For');
  if (forwarded) {
    const lastIp = forwarded.split(',').pop()?.trim();
    return `ip:${lastIp}`;
  }

  // 5. Direct IP (fallback)
  return `ip:${c.req.socket?.remoteAddress || 'unknown'}`;
}

// Use in rate limiter
const limiter = rateLimiter({
  keyGenerator: getClientIdentifier,
  // ... other options
});
```

---

### Authenticated vs Anonymous Users

```typescript
const app = new Hono();

// Strict limits for anonymous users
const anonLimiter = rateLimiter({
  windowMs: 60 * 1000,      // 1 minute
  limit: 10,                 // 10 requests
  keyGenerator: (c) => `anon:${c.req.header('cf-connecting-ip')}`
});

// Generous limits for authenticated users
const authLimiter = rateLimiter({
  windowMs: 60 * 1000,      // 1 minute
  limit: 100,                // 100 requests
  keyGenerator: (c) => `auth:${c.get('userId')}`
});

// Middleware that applies appropriate limiter
const smartLimiter = async (c, next) => {
  const isAuthenticated = !!c.get('userId');
  
  if (isAuthenticated) {
    // Apply auth limiter and continue
    return authLimiter(c, next);
  } else {
    // Apply anonymous limiter
    return anonLimiter(c, next);
  }
};

app.use(smartLimiter);
```

---

## HTTP RESPONSE HANDLING

### Proper 429 Status Code

**HTTP 429: Too Many Requests**

```typescript
app.use((c, next) => {
  const handleRateLimit = (remaining: number, resetTime: number) => {
    return c.json(
      {
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit for this endpoint.',
        remaining,
        resetIn: Math.max(0, resetTime - Date.now())
      },
      429
    );
  };
  
  c.set('handleRateLimit', handleRateLimit);
  return next();
});
```

---

### Required Headers

**RateLimit Headers (IETF Draft-6):**

```typescript
interface RateLimitHeaders {
  'RateLimit-Limit': string;          // Total requests allowed
  'RateLimit-Remaining': string;      // Requests remaining
  'RateLimit-Reset': string;          // Unix timestamp when limit resets
  'Retry-After': string;              // Seconds to wait before retry (on 429)
  'X-RateLimit-Limit': string;        // Legacy, some clients expect this
  'X-RateLimit-Remaining': string;    // Legacy
  'X-RateLimit-Reset': string;        // Legacy
}

// Middleware to add headers to all responses
const addRateLimitHeaders = (limit: number, remaining: number, resetAt: Date) => {
  return {
    'RateLimit-Limit': limit.toString(),
    'RateLimit-Remaining': remaining.toString(),
    'RateLimit-Reset': Math.floor(resetAt.getTime() / 1000).toString(),
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000).toString()
  };
};

// On rate limit exceeded, add Retry-After
const rateLimitResponse = (c, resetAt: Date) => {
  const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
  
  return c.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
      retryAfter
    },
    429,
    {
      'Retry-After': retryAfter.toString(),
      'RateLimit-Reset': Math.floor(resetAt.getTime() / 1000).toString()
    }
  );
};
```

---

### Client Communication Strategy

```typescript
// In frontend/SDK
function handleRateLimit(response: Response) {
  const retryAfter = parseInt(
    response.headers.get('Retry-After') || '60'
  );
  
  const resetTime = new Date(
    parseInt(response.headers.get('RateLimit-Reset') || '0') * 1000
  );
  
  console.warn(`Rate limited. Retry after ${retryAfter}s (resets at ${resetTime})`);
  
  // Implement exponential backoff
  setTimeout(() => {
    retryRequest();
  }, retryAfter * 1000);
}

// For SDK consumers
class DrainedAPIClient {
  private rateLimitQueue: Array<() => Promise<any>> = [];
  private isBackingOff = false;
  
  async executeWithRateLimit<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.rateLimitQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          if (error.status === 429) {
            this.handleRateLimit(error);
          }
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.isBackingOff || this.rateLimitQueue.length === 0) return;
    
    const fn = this.rateLimitQueue.shift();
    if (fn) await fn();
  }
  
  private handleRateLimit(error: any) {
    this.isBackingOff = true;
    const retryAfter = parseInt(error.headers['retry-after']) || 60;
    
    setTimeout(() => {
      this.isBackingOff = false;
      this.processQueue();
    }, retryAfter * 1000);
  }
}
```

---

## CAPTCHA INTEGRATION

### CAPTCHA Service Comparison (December 2025)

| Feature | Cloudflare Turnstile | Google reCAPTCHA v3 | hCaptcha |
|---------|-------------------|-------------------|----------|
| **User Experience** | Invisible, frictionless | Invisible | Puzzle-based, trickier |
| **Privacy** | GDPR-compliant ✅ | Collects data ❌ | Privacy-focused ✅ |
| **Free Tier** | Up to 1M assessments/month | Up to 10k/month | Generous free tier |
| **Performance** | ~200kb JavaScript | ~500kb JavaScript | Medium |
| **Maturity** | Newer (2022) | Mature & battle-tested | Established |
| **Integration Complexity** | Simple | Simple | Simple |

**Recommendation:** **Cloudflare Turnstile (Free)** — Best for your use case (serverless, privacy-conscious, generous free tier)

---

### Implementing Cloudflare Turnstile

**1. Frontend (Svelte):**

```svelte
<script>
  import Turnstile from 'svelte-turnstile';
  let token = '';

  const handleToken = (event) => {
    token = event.detail;
  };

  async function submitForm() {
    const response = await fetch('/api/check-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: '...',
        'cf-turnstile-response': token
      })
    });
  }
</script>

<form on:submit|preventDefault={submitForm}>
  <Turnstile
    siteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY}
    on:token={handleToken}
  />
  <button type="submit" disabled={!token}>Check Wallet</button>
</form>
```

**2. Backend (Hono):**

```typescript
async function verifyTurnstileToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token
      })
    });

    const { success, error_codes } = await response.json();

    if (!success) {
      console.warn('Turnstile verification failed:', error_codes);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    // Fail open: if verification service is down, allow request
    return true;
  }
}

const app = new Hono();

// Middleware to verify CAPTCHA for sensitive operations
const requireCaptcha = async (c, next) => {
  const { 'cf-turnstile-response': token } = await c.req.json();

  if (!token) {
    return c.json(
      { error: 'CAPTCHA token required' },
      400
    );
  }

  const isValid = await verifyTurnstileToken(token);

  if (!isValid) {
    return c.json(
      { error: 'CAPTCHA verification failed' },
      403
    );
  }

  return next();
};

// Require CAPTCHA for high-value endpoints
app.post('/api/report-drain', requireCaptcha, async (c) => {
  // Process drain report
});
```

---

### When to Trigger CAPTCHA

**Strategy for "Have I Been Drained":**

```typescript
const shouldRequireCaptcha = async (c: HonoRequest): Promise<boolean> => {
  // Always require for unauthenticated users on sensitive endpoints
  if (!c.get('userId')) {
    return true;
  }

  // Check for suspicious patterns
  const ip = c.req.header('cf-connecting-ip');
  const recentRequests = await redis.get(`req:${ip}:count`);

  if (recentRequests && parseInt(recentRequests) > 50) {
    // Unusual activity detected
    return true;
  }

  // Check user reputation
  const userReputation = await db.userReputation.findOrCreate(c.get('userId'));
  if (userReputation.suspiciousScore > 0.7) {
    return true;
  }

  // Check for rapid creation of new accounts
  const createdAt = new Date(c.get('userCreatedAt'));
  const ageMinutes = (Date.now() - createdAt.getTime()) / (1000 * 60);
  if (ageMinutes < 30 && ageMinutes > 0) {
    // Account less than 30 minutes old
    return true;
  }

  return false;
};

app.post('/api/report-drain', async (c, next) => {
  if (await shouldRequireCaptcha(c)) {
    const token = c.req.query('captcha-token');
    if (!token || !(await verifyTurnstileToken(token))) {
      return c.json(
        { error: 'CAPTCHA verification required', requiresCaptcha: true },
        403
      );
    }
  }

  return next();
});
```

---

## CLOUDFLARE FEATURES

### Cloudflare Rate Limiting Rules (WAF)

**What Cloudflare provides (Free & Paid):**

```yaml
# Cloudflare Dashboard → Security → WAF → Rate Limiting Rules

# Example: Limit /api/* endpoints
Path: /api/*
Action: Block
Characteristics: IP Address
Requests per period: 100
Period: 60 seconds  # Must be 60 or 10
Duration (mitigation): 300 seconds  # How long to block
```

**Limitations (Free Tier):**
- ❌ No rate limiting rules on free plan
- ❌ Rate limiting rules require Pro plan ($25/month) or higher
- ✅ Can use Workers Rate Limiting API (on free tier with limits)

---

### Cloudflare Workers Rate Limiting API

**Available on Free Tier (with limits):**

```typescript
// wrangler.toml
[[rate_limiting_namespaces]]
name_id = "1"

// worker.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    // Define rate limit key
    const key = new URL(request.url).pathname + 
                ":" + 
                request.headers.get('cf-connecting-ip');

    // Check rate limit
    const { success, limitRemaining } = await env.RATE_LIMITER.limit({
      key,
      limit: 100,           // requests
      period: 60            // seconds (must be 10 or 60)
    });

    if (!success) {
      return new Response('Too many requests', { status: 429 });
    }

    // Continue to origin
    const response = await fetch(request);
    response.headers.set('X-RateLimit-Remaining', limitRemaining.toString());
    return response;
  }
};
```

---

### Can Cloudflare Rate Limiting Replace App-Level Rate Limiting?

**Short Answer: No, not completely.**

| Scenario | Cloudflare | App-Level |
|----------|-----------|-----------|
| **Distributed systems** | ✅ Works globally | ✅ Per-node limiting |
| **Custom per-user limits** | ❌ Limited flexibility | ✅ Full control |
| **Different limits per endpoint** | ⚠️ Complex | ✅ Easy |
| **Authenticated users** | ❌ Hard to implement | ✅ Native |
| **Graceful degradation** | ❌ Hard block | ✅ Custom responses |

**Best Approach (Layered):**
1. **Cloudflare WAF** → Global DDoS protection & basic rate limiting
2. **Cloudflare Workers** → Edge-level rate limiting
3. **Application Level** → Smart, user-aware rate limiting with CAPTCHA

---

## SOLANA-SPECIFIC CONSIDERATIONS

### RPC Rate Limiting

**Challenge:** Solana RPC nodes have rate limits that cascade from your API to users.

```typescript
// Track RPC calls separate from API calls
interface RpcBudget {
  rpcCallsPerMinute: number;
  rpcCallsPerHour: number;
}

const RPC_BUDGETS = {
  'getBalance': { rpcCallsPerMinute: 50, rpcCallsPerHour: 500 },
  'getSignaturesForAddress': { rpcCallsPerMinute: 20, rpcCallsPerHour: 200 },
  'getProgramAccounts': { rpcCallsPerMinute: 10, rpcCallsPerHour: 100 },
  'simulateTransaction': { rpcCallsPerMinute: 30, rpcCallsPerHour: 300 }
};

// Middleware to track RPC calls
const trackRpcCall = async (method: string, userId: string) => {
  const key = `rpc:${userId}:${method}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 60); // 1-minute window
  }

  const budget = RPC_BUDGETS[method];
  if (count > budget.rpcCallsPerMinute) {
    return false; // Over limit
  }

  return true;
};

// When calling Solana RPC:
async function getWalletTransactions(
  address: string,
  userId: string,
  limit: number = 50
) {
  // Check RPC budget first
  const allowed = await trackRpcCall('getSignaturesForAddress', userId);
  if (!allowed) {
    throw new Error('RPC rate limit exceeded for this wallet analysis');
  }

  // Use Helius or similar RPC provider with built-in rate limiting
  const signatures = await heliusRpc.getSignaturesForAddress(
    new PublicKey(address),
    { limit, before: null }
  );

  return signatures;
}
```

---

### Circuit Breaker Pattern for RPC Failover

```typescript
class RpcCircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async executeRpc<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Check if we should try again
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > 30000
      ) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN. RPC provider is down.');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.successCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= 5) {
      this.state = 'OPEN';
    }
  }
}

// Usage
const rpcBreaker = new RpcCircuitBreaker();

async function safeRpcCall<T>(
  fn: () => Promise<T>,
  fallbackFn?: () => Promise<T>
): Promise<T> {
  try {
    return await rpcBreaker.executeRpc(fn);
  } catch (error) {
    if (fallbackFn) {
      return await fallbackFn(); // Use backup RPC provider
    }
    throw error;
  }
}
```

---

### Caching Strategy for Solana Data

```typescript
// Cache frequently queried addresses
const CACHE_DURATIONS = {
  walletTransactions: 5 * 60 * 1000,    // 5 minutes
  tokenBalance: 10 * 60 * 1000,         // 10 minutes
  nftMetadata: 60 * 60 * 1000,          // 1 hour
  publicKeyInfo: 24 * 60 * 60 * 1000    // 1 day
};

async function getCachedTransactions(
  address: string,
  forceRefresh = false
): Promise<SignatureInfo[]> {
  const cacheKey = `txs:${address}`;

  if (!forceRefresh) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  // Not in cache or force refresh requested
  const signatures = await heliusRpc.getSignaturesForAddress(
    new PublicKey(address),
    { limit: 100 }
  );

  // Cache for future requests
  await redis.setex(
    cacheKey,
    CACHE_DURATIONS.walletTransactions / 1000,
    JSON.stringify(signatures)
  );

  return signatures;
}
```

---

## RECOMMENDED LIMITS

### By Endpoint Type

```typescript
const ENDPOINT_LIMITS = {
  // Public endpoints - loose limits
  'GET /health': {
    anonymous: '1000/hour',
    authenticated: 'unlimited'
  },

  // Basic wallet checks - moderate limits
  'GET /api/v1/wallet/:address/summary': {
    anonymous: '50/hour',
    free: '500/hour',
    pro: '5000/hour'
  },

  // Historical data - strict limits (expensive RPC calls)
  'GET /api/v1/wallet/:address/transactions': {
    anonymous: '20/hour',
    free: '200/hour',
    pro: '2000/hour'
  },

  // Report submission - very strict (prevents spam)
  'POST /api/v1/drains': {
    anonymous: 'BLOCKED (require CAPTCHA)',
    free: '10/hour (with CAPTCHA)',
    pro: '100/hour'
  },

  // Registry queries - moderate limits
  'GET /api/v1/drainers/search': {
    anonymous: '30/hour',
    authenticated: '300/hour'
  },

  // Community contributions - strict limits
  'POST /api/v1/drainers/report': {
    anonymous: 'BLOCKED',
    free: '5/hour (with CAPTCHA)',
    pro: '50/hour'
  }
};
```

---

### Suggested Values for Development vs Production

**Development:**
```typescript
const DEV_LIMITS = {
  checkWallet: { requestsPerMinute: 60, requestsPerHour: 1000 },
  historicalData: { requestsPerMinute: 30, requestsPerHour: 500 },
  reportDrain: { requestsPerMinute: 10, requestsPerHour: 100 },
  anonUser: { requestsPerMinute: 5, requestsPerHour: 50 }
};
```

**Production:**
```typescript
const PROD_LIMITS = {
  checkWallet: { requestsPerMinute: 20, requestsPerHour: 200 },
  historicalData: { requestsPerMinute: 10, requestsPerHour: 100 },
  reportDrain: { requestsPerMinute: 3, requestsPerHour: 30 },
  anonUser: { requestsPerMinute: 2, requestsPerHour: 20 },
  
  // RPC-specific
  rpcCallsPerMinute: 100,
  rpcCallsPerHour: 5000
};
```

---

## HANDLING HIGH-VOLUME LEGITIMATE USERS

### API Key System for Trusted Users

```typescript
// Database schema
interface ApiKey {
  id: string;
  userId: string;
  key: string;
  tier: 'basic' | 'professional' | 'enterprise';
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  createdAt: Date;
  expiresAt: Date | null;
  active: boolean;
}

// Generate API keys for verified users
async function generateApiKey(userId: string, tier: string) {
  const key = crypto.randomBytes(32).toString('hex');
  const hashedKey = hash(key);

  await db.apiKeys.create({
    userId,
    key: hashedKey,
    tier,
    rateLimit: TIER_LIMITS[tier],
    active: true
  });

  return key; // Return to user only once
}

// Middleware to check API keys
const apiKeyMiddleware = async (c, next) => {
  const apiKey = c.req.header('X-API-Key');

  if (apiKey) {
    const key = await db.apiKeys.findByKey(hash(apiKey));

    if (!key || !key.active || (key.expiresAt && key.expiresAt < new Date())) {
      return c.json({ error: 'Invalid or expired API key' }, 401);
    }

    c.set('apiKeyId', key.id);
    c.set('userId', key.userId);
    c.set('tier', key.tier);
    c.set('rateLimitConfig', key.rateLimit);
  }

  return next();
};

app.use(apiKeyMiddleware);
```

---

### Whitelisting for Trusted Partners

```typescript
interface WhitelistEntry {
  id: string;
  type: 'ip' | 'api-key' | 'user-id';
  value: string;
  reason: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  } | null; // null = unlimited
  createdAt: Date;
}

async function isWhitelisted(c: HonoRequest): Promise<WhitelistEntry | null> {
  const userId = c.get('userId');
  if (userId) {
    const entry = await db.whitelist.findOne({
      type: 'user-id',
      value: userId
    });
    if (entry) return entry;
  }

  const ip = c.req.header('cf-connecting-ip');
  if (ip) {
    const entry = await db.whitelist.findOne({
      type: 'ip',
      value: ip
    });
    if (entry) return entry;
  }

  return null;
}

const whitelistMiddleware = async (c, next) => {
  const whitelistEntry = await isWhitelisted(c);

  if (whitelistEntry) {
    c.set('isWhitelisted', true);
    if (whitelistEntry.rateLimit) {
      c.set('rateLimitConfig', whitelistEntry.rateLimit);
    } else {
      c.set('isUnlimited', true);
    }
  }

  return next();
};

app.use(whitelistMiddleware);
```

---

### Monitoring & Alerts

```typescript
// Alert when approaching limits
async function checkRateLimitHealth() {
  const topUsers = await redis.zrevrange(
    'ratelimit:daily:usage',
    0,
    9,
    'WITHSCORES'
  );

  for (const [userId, usage] of topUsers) {
    const percent = (parseInt(usage) / DAILY_LIMIT) * 100;

    if (percent > 90) {
      await notifyUser(userId, {
        type: 'approaching_limit',
        usage: parseInt(usage),
        limit: DAILY_LIMIT,
        percentRemaining: 100 - percent
      });

      if (percent > 95) {
        await notifyAdmins({
          type: 'high_usage_alert',
          userId,
          usage: parseInt(usage),
          limit: DAILY_LIMIT
        });
      }
    }
  }
}

// Run daily
cron.schedule('0 0 * * *', checkRateLimitHealth);
```

---

## IMPLEMENTATION CHECKLIST

- [ ] **Algorithm Selection:** Chosen Sliding Window Counter (recommended)
- [ ] **Rate Limiting Library:** Installed `hono-rate-limiter` with Redis backend
- [ ] **Redis Setup:** Created Upstash Redis instance (free tier)
- [ ] **Dimensioned Limits:** Configured per-tier, per-endpoint limits
- [ ] **Anonymous User Protection:** Strict limits for unauthenticated access
- [ ] **Authenticated User Benefits:** Higher limits for logged-in users
- [ ] **NAT/Shared IP Handling:** Using Cloudflare IP + fallback chain
- [ ] **HTTP Headers:** Added RateLimit-* and X-RateLimit-* headers
- [ ] **429 Responses:** Proper error messages with Retry-After
- [ ] **CAPTCHA Integration:** Implemented Cloudflare Turnstile
- [ ] **CAPTCHA Triggers:** Configured rules for suspicious activity
- [ ] **Cloudflare WAF:** Enabled rate limiting rules (if Pro+)
- [ ] **Cloudflare Workers:** Set up edge-level rate limiting
- [ ] **Solana RPC Limits:** Tracked RPC calls separately
- [ ] **Circuit Breaker:** Implemented for RPC failover
- [ ] **Caching:** Added Redis cache for hot data
- [ ] **API Keys:** Generated for trusted users
- [ ] **Whitelisting:** Configured for partners
- [ ] **Monitoring:** Set up alerts for high usage
- [ ] **Documentation:** Created API rate limit docs for consumers

---

## QUICK START CODE

```typescript
// Rate Limiting Setup for Hono (Production-Ready)

import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { RedisStore } from '@hono-rate-limiter/redis';
import { Redis } from '@upstash/redis/cloudflare';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const app = new Hono();

// Global rate limiter
const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => {
    const userId = c.get('userId');
    return userId || c.req.header('cf-connecting-ip') || 'anonymous';
  },
  store: new RedisStore({
    client: redis,
    prefix: 'rl:'
  }),
  handler: (c) => {
    const resetTime = c.req.header('RateLimit-Reset');
    const retryAfter = resetTime 
      ? Math.max(1, Math.ceil((parseInt(resetTime) * 1000 - Date.now()) / 1000))
      : 900;

    return c.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter
      },
      429,
      {
        'Retry-After': retryAfter.toString(),
        'RateLimit-Reset': resetTime || ''
      }
    );
  }
});

app.use(limiter);

app.get('/api/check-wallet/:address', (c) => {
  return c.json({ 
    status: 'analyzed',
    address: c.req.param('address')
  });
});

export default app;
```

---

## RESOURCES & FURTHER READING

- [hono-rate-limiter Documentation](https://github.com/rhinobase/hono-rate-limiter)
- [Upstash Redis (Free Tier)](https://upstash.com)
- [Cloudflare Turnstile](https://www.cloudflare.com/application-services/products/turnstile/)
- [Cloudflare Workers Rate Limiting API](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [IETF RateLimit Headers Standard](https://www.ietf.org/archive/id/draft-ietf-httpapi-ratelimit-headers-07.html)
- [Solana RPC Optimization Guide](https://www.helius.dev/docs/rpc/optimization-techniques)
- [API Security Best Practices 2025](https://www.aikido.dev/blog/api-security-guide)

---

**Document Generated:** December 2025  
**Last Updated:** For Hono 4.x, Node.js 18+, Cloudflare Workers, Upstash Redis  
**Status:** Production-Ready Recommendations