# Public API Feature Plan

## Overview

This document outlines the plan for implementing a public API endpoint with user-agent-based rate limiting and frontend API documentation.

---

## 1. Public API Endpoint Design

### 1.1 Endpoint Specification

**Primary Endpoint (Unified - Preferred):** `GET /api/v1/check`

**Purpose:** Unified endpoint that checks both drainer addresses and wallet security status. This is the preferred endpoint for most use cases.

**Request Parameters:**
- `address` (required): Solana wallet address to check
- `limit` (optional): Transaction limit for analysis (default: 50, max: 200)
- `experimental` (optional): Include experimental detections (default: false)

**Example Request:**
```
GET /api/v1/check?address=ABC123...&limit=50&experimental=false
```

**Alternative Endpoints (For Specific Use Cases):**

For users who need separate endpoints for specific use cases, we also provide:

- `GET /api/v1/drainer/:address` - Check only if address is a known drainer (faster, no analysis)
- `GET /api/v1/analyze/:address` - Perform full wallet analysis only (skip drainer check)

**Versioning:**
- All endpoints use `/api/v1/` prefix
- Future versions will use `/api/v2/`, `/api/v3/`, etc.
- Version in URL allows breaking changes while maintaining backward compatibility

### 1.2 Response Logic Flow

```
1. Validate address format (base58, 32-44 chars)
   └─ Invalid → Return 400 error

2. Check if address is a known drainer (on-chain registry)
   └─ Is drainer → Return drainer report immediately
   
3. If not a drainer, perform full wallet analysis
   └─ Get transactions via Helius
   └─ Run detection algorithms
   └─ Aggregate risk factors
   └─ Return analysis report
```

### 1.3 Response Schema

**Drainer Address Response:**
```json
{
  "success": true,
  "type": "drainer",
  "data": {
    "drainerAddress": "ABC123...",
    "reportCount": 42,
    "firstSeen": "2024-01-15T10:30:00Z",
    "lastSeen": "2024-12-10T14:20:00Z",
    "totalSolReported": 150.5,
    "recentReporters": ["DEF456...", "GHI789..."]
  },
  "timestamp": 1702224000000
}
```

**Wallet Analysis Response:**
```json
{
  "success": true,
  "type": "wallet_analysis",
  "data": {
    "walletAddress": "ABC123...",
    "overallRisk": "AT_RISK",
    "riskScore": 65,
    "factors": [
      {
        "type": "unlimited_approval",
        "severity": "HIGH",
        "description": "Unlimited token approval detected"
      }
    ],
    "attackType": "Token Drain",
    "drainedAssets": [],
    "recommendations": [
      "Revoke unlimited approvals",
      "Check recent transactions"
    ],
    "checkedAt": "2024-12-10T14:20:00Z"
  },
  "timestamp": 1702224000000
}
```

---

## 2. User-Agent Based Rate Limiting

### 2.1 User-Agent Format Specification

**Required Format:**
```
AppName/Version (Contact; OptionalInfo)
```

**Examples:**
- ✅ `MyApp/1.0.0 (contact@example.com)`
- ✅ `WalletScanner/2.1.0 (https://example.com/contact)`
- ✅ `SecurityBot/1.5.0 (support@company.com; API Key: abc123)`
- ❌ `Mozilla/5.0` (generic browser)
- ❌ `curl/7.68.0` (no contact info)
- ❌ `MyApp` (missing version)

### 2.2 Rate Limit Tiers

| Tier | User-Agent Format | Rate Limit | Window | Use Case |
|------|------------------|------------|--------|----------|
| **Unregistered** | Missing or invalid format | 10 requests/hour | 1 hour | Generic browsers, curl, bots without proper identification |
| **Registered** | Valid format with contact | 100 requests/hour | 1 hour | Apps that identify themselves properly |
| **Enterprise** | Valid format + API key | 1000 requests/hour | 1 hour | Contact us for API key and higher limits |

**Important Notes:**
- **Cached Responses:** Rate limits do NOT apply to cached responses. If a response is served from cache, it does not count toward rate limit quotas.
- **Good Faith Usage:** While cached responses are exempt, good faith usage is expected. Excessive requests per second (RPS) that bypass cache will trigger stricter rate limits, which will affect all consumers of the API.
- **Rate Limit Enforcement:** Rate limits are enforced per User-Agent (if provided) and per IP address. IP-based limits are stricter for requests without proper User-Agent identification.

### 2.3 Rate Limit Implementation Strategy

**Infrastructure:**
- **Redis:** Use Redis from docker-compose internal network (not external Upstash)
- **Storage:** Rate limits tracked per User-Agent AND per IP address
- **Enforcement:** IP-based limits are stricter for requests without User-Agent
- **Response:** 429 status code with TTL (Time To Live) in Retry-After header

**Middleware Flow:**
```
1. Check if response is cached → If yes, skip rate limiting
2. Extract User-Agent header
3. Parse and validate format
4. Check for API key (if provided)
5. Determine rate limit tier
6. Check rate limit in Redis (per User-Agent + per IP)
7. Apply rate limiting based on tier
8. Add rate limit headers to response
```

**Rate Limit Headers (RFC 7239 draft):**
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1702227600
RateLimit-Policy: 100;w=3600
Retry-After: 3600  (when rate limit exceeded)
```

**Redis Key Structure:**
- Per IP (stricter, for no User-Agent): `rl:ip:{ip_address}:{endpoint}`
- Per User-Agent: `rl:ua:{app_name}:{endpoint}`
- Per API Key: `rl:key:{api_key}:{endpoint}`

### 2.4 User-Agent Parser

**Validation Rules:**
- Must contain app name (alphanumeric, hyphens, underscores)
- Must contain version (semver format: X.Y.Z)
- Must contain contact info in parentheses (email or URL)
- Optional additional info after semicolon

**Parser Function:**
```typescript
interface ParsedUserAgent {
  isValid: boolean;
  appName?: string;
  version?: string;
  contact?: string;
  apiKey?: string;
  tier: 'unregistered' | 'registered' | 'enterprise';
}

function parseUserAgent(ua: string | undefined): ParsedUserAgent {
  // Implementation details
}
```

---

## 3. API Key System (Future Enhancement)

### 3.1 API Key Format

**Header:** `X-API-Key: your-api-key-here`

**User-Agent with API Key:**
```
MyApp/1.0.0 (contact@example.com; API Key: abc123xyz)
```

### 3.2 API Key Management

- **Storage:** Database table for API keys
- **Validation:** Middleware checks API key validity
- **Tier Assignment:** API keys can have custom rate limits
- **Key Generation:** MVP - Keys created manually in database by admins
- **Pricing:** Keys are paid if rate limits exceed 1,000 requests/hour
- **Contact Process:** Users request API keys via contact form/email

**Database Schema:**
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  app_name VARCHAR(100) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  invalidated_at TIMESTAMP,
  invalidation_reason TEXT
);
```

### 3.3 API Key Invalidation Endpoint

**Critical Security Feature:** Endpoint to invalidate compromised API keys.

**Endpoint:** `POST /api/v1/keys/:keyId/invalidate`

**Purpose:** 
- Immediately invalidate a compromised API key
- Generate a new API key automatically
- Send new key to registered email address
- Log invalidation for security audit

**Request:**
```json
POST /api/v1/keys/{keyId}/invalidate
Authorization: Bearer {api_key_to_invalidate}
```

**Response:**
```json
{
  "success": true,
  "message": "API key invalidated. New key sent to registered email.",
  "keyId": "uuid-of-invalidated-key",
  "newKeyId": "uuid-of-new-key",
  "emailSent": true,
  "timestamp": 1702224000000
}
```

**Implementation:**
1. Verify the API key exists and is active
2. Mark old key as invalidated (`is_active = false`, set `invalidated_at`)
3. Generate new API key (secure random string, hashed in DB)
4. Create new database record with same app details
5. Send email to `contact_email` with new API key
6. Log invalidation event for security audit
7. Return success response

**Email Template:**
```
Subject: Your API Key Has Been Regenerated

Your API key for {app_name} has been invalidated and regenerated.

New API Key: {new_api_key}
Key ID: {new_key_id}

Please update your application immediately. The old key will no longer work.

If you did not request this change, please contact support immediately.
```

**Security Considerations:**
- Only the key owner (via the key itself) or admin can invalidate
- Rate limit invalidation endpoint (prevent abuse)
- Log all invalidations with IP address and timestamp
- Email verification before sending new key (optional enhancement)

---

## 4. Hono Framework Best Practices

### 4.1 Middleware Pattern

Hono uses an onion model for middleware execution. Order matters:

```typescript
app.use('*', logger())                    // 1. Logging (outermost)
app.use('/api/v1/*', cors())              // 2. CORS
app.use('/api/v1/*', userAgentParser)     // 3. Parse user agent
app.use('/api/v1/*', publicApiLimiter)    // 4. Rate limiting
app.get('/api/v1/check', handler)         // 5. Route handler (innermost)
```

### 4.2 Context Usage

Use `c.set()` and `c.get()` to pass data between middleware:

```typescript
// In userAgentParser middleware
app.use('/api/v1/*', async (c, next) => {
  const parsed = parseUserAgent(c.req.header('User-Agent'));
  c.set('userAgentTier', parsed.tier);  // Store in context
  c.set('parsedUserAgent', parsed);
  await next();
});

// In route handler
app.get('/api/v1/check', async (c) => {
  const tier = c.get('userAgentTier');  // Retrieve from context
  // Use tier for logging, analytics, etc.
});
```

### 4.3 Error Handling

Hono provides `HTTPException` for structured error responses:

```typescript
import { HTTPException } from 'hono/http-exception';

// In route handler
if (!address) {
  throw new HTTPException(400, {
    message: 'Address parameter is required',
  });
}

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  // Handle other errors
  return c.json({ error: 'Internal server error' }, 500);
});
```

### 4.4 Type Safety with Zod

Leverage Hono's Zod integration for end-to-end type safety:

```typescript
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const querySchema = z.object({
  address: z.string().min(32).max(44),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

app.get('/api/v1/check',
  zValidator('query', querySchema),
  async (c) => {
    const { address, limit } = c.req.valid('query'); // Fully typed!
    // TypeScript knows address is string, limit is number | undefined
  }
);
```

### 4.5 Response Helpers

Use Hono's response helpers for consistent responses:

```typescript
// JSON response
return c.json({ success: true, data: result }, 200);

// With headers
return c.json({ success: true }, 200, {
  'X-Custom-Header': 'value',
  'RateLimit-Remaining': '95',
});

// Error response
return c.json({ error: 'Not found' }, 404);
```

### 4.6 Route Grouping

Organize routes using Hono's route grouping:

```typescript
// packages/api/src/routes/public-api.ts
import { Hono } from 'hono';

const app = new Hono().basePath('/api/v1');

app.get('/check', handler);
app.get('/health', healthHandler);

export default app;

// In main index.ts
import publicApiRoutes from './routes/public-api';
app.route('/', publicApiRoutes); // Mounts at /api/v1/*
```

---

## 5. Implementation Details

### 4.1 File Structure (Hono Pattern)

```
packages/api/src/
├── routes/
│   └── public-api.ts          # New public API endpoint (Hono route)
├── middleware/
│   ├── rate-limiter.ts        # Rate limiting middleware (hono-rate-limiter)
│   ├── user-agent-parser.ts   # User-Agent parsing logic
│   └── index.ts              # Export all middleware
├── lib/
│   └── rate-limit-config.ts   # Rate limit configurations
└── services/
    └── api-key-service.ts     # API key validation (future)
```

**Hono Route Pattern:**
- Each route file exports a `Hono` instance
- Routes are mounted in `src/index.ts` using `app.route()`
- Middleware is reusable across routes
- Type safety with Zod validation

### 4.2 Rate Limiting Middleware (Hono-Specific)

**Dependencies:**
- `hono-rate-limiter` - Core rate limiting package
- `@hono-rate-limiter/redis` - Redis store adapter
- `ioredis` or `redis` - Redis client for docker-compose Redis connection

**Installation:**
```bash
cd packages/api
bun add hono-rate-limiter @hono-rate-limiter/redis ioredis
```

**Redis Connection:**
- Use Redis from docker-compose internal network
- Connection string: `redis://redis:6379` (internal docker network)
- No authentication needed for internal network
- Fallback to environment variable for flexibility

**Hono Middleware Pattern:**
```typescript
import { rateLimiter } from 'hono-rate-limiter';
import { RedisStore } from '@hono-rate-limiter/redis';
import Redis from 'ioredis';

// Initialize Redis (docker-compose internal network)
// Connection uses docker-compose service name 'redis' for internal network
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis', // docker-compose service name
  port: parseInt(process.env.REDIS_PORT || '6379'),
  // No password for internal network
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Cache check middleware (runs before rate limiting)
// Cached responses bypass rate limiting
app.use('/api/v1/*', async (c, next) => {
  // Check if we have a cached response for this request
  const cacheKey = `cache:${c.req.method}:${c.req.url}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    // Mark in context that this is a cached response
    c.set('isCachedResponse', true);
    // Rate limiting middleware will check this and skip
  }
  
  await next();
  
  // After handler, cache successful responses
  if (c.res.status === 200 && !c.get('isCachedResponse')) {
    const responseData = await c.res.clone().json();
    await redis.setex(cacheKey, 300, JSON.stringify(responseData)); // 5 min cache
  }
});

// Create rate limiter with user-agent aware key generation
// Note: This middleware checks cache first - cached responses bypass rate limiting
const publicApiLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 100, // Default for registered (will be adjusted per tier)
  standardHeaders: 'draft-6', // RFC 7239 draft headers
  store: new RedisStore({
    client: redis,
    prefix: 'rl:public-api:',
  }),
  keyGenerator: (c) => {
    // Check if response would be cached (skip rate limiting)
    // This is handled in a separate cache-check middleware
    
    // Use user-agent parser to determine tier
    const parsed = parseUserAgent(c.req.header('User-Agent'));
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For')?.split(',')[0] || 
               c.req.header('X-Real-IP') ||
               'unknown';
    
    // Track both IP and User-Agent
    // IP limits are stricter for unregistered users
    if (parsed.tier === 'enterprise' && parsed.apiKey) {
      return `enterprise:${parsed.apiKey}`;
    }
    if (parsed.tier === 'registered') {
      // Track by both IP and User-Agent for registered users
      return `registered:${ip}:${parsed.appName}`;
    }
    // Stricter IP-based limit for unregistered
    return `unregistered:${ip}`;
  },
  handler: (c) => {
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
  },
});
```

**Key Generation:**
- Unregistered: `rl:public-api:unregistered:{ip_address}`
- Registered: `rl:public-api:registered:{ip_address}:{app_name}`
- Enterprise: `rl:public-api:enterprise:{api_key}`

**Dynamic Rate Limits:**
Since Hono middleware can access context, we can dynamically adjust limits based on user-agent tier:
```typescript
// Middleware to set rate limit based on tier
app.use('/api/v1/check', async (c, next) => {
  const parsed = parseUserAgent(c.req.header('User-Agent'));
  c.set('rateLimitTier', parsed.tier);
  
  // Adjust limit based on tier
  if (parsed.tier === 'unregistered') {
    // Apply stricter limit
  } else if (parsed.tier === 'registered') {
    // Apply standard limit
  } else if (parsed.tier === 'enterprise') {
    // Apply higher limit
  }
  
  await next();
});
```

### 4.3 Endpoint Implementation (Hono Pattern)

**Route Handler with Hono Best Practices:**
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

// Query parameter validation schema
const checkQuerySchema = z.object({
  address: z.string().min(32).max(44),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  experimental: z.coerce.boolean().optional().default(false),
});

// Route with middleware chain
app.get('/api/v1/check',
  // 1. User-Agent parsing middleware
  userAgentParser,
  
  // 2. Rate limiting (applied based on tier from userAgentParser)
  publicApiLimiter,
  
  // 3. Query parameter validation
  zValidator('query', checkQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({
        success: false,
        error: 'Invalid query parameters',
        details: result.error.errors,
        timestamp: Date.now(),
      }, 400);
    }
  }),
  
  // 4. Main handler
  async (c) => {
    const { address, limit, experimental } = c.req.valid('query');
    
    // Validate Solana address format
    try {
      new PublicKey(address);
    } catch (_err) {
      return c.json({
        success: false,
        error: 'Invalid Solana address',
        timestamp: Date.now(),
      }, 400);
    }
    
    // Step 1: Check if address is a known drainer
    const network = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet';
    const rpcUrl = network === 'mainnet' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const anchorClient = new AnchorClient(connection, process.env.ANCHOR_WALLET);
    
    const drainerReport = await anchorClient.getDrainerReport(address);
    
    if (drainerReport && drainerReport.reportCount > 0) {
      // Return drainer report immediately
      return c.json({
        success: true,
        type: 'drainer',
        data: {
          drainerAddress: drainerReport.drainerAddress.toString(),
          reportCount: drainerReport.reportCount,
          firstSeen: new Date(drainerReport.firstSeen * 1000).toISOString(),
          lastSeen: new Date(drainerReport.lastSeen * 1000).toISOString(),
          totalSolReported: drainerReport.totalSolReported / 1e9,
          recentReporters: drainerReport.recentReporters.map(r => r.toString()),
        },
        timestamp: Date.now(),
      });
    }
    
    // Step 2: Perform full wallet analysis
    const heliusKey = process.env.HELIUS_API_KEY;
    if (!heliusKey) {
      return c.json({
        success: false,
        error: 'HELIUS_API_KEY is not configured',
        timestamp: Date.now(),
      }, 500);
    }
    
    const heliusClient = new HeliusClient(heliusKey, network);
    const transactions = await heliusClient.getTransactionsForAddress(address, { limit });
    
    const detections: DetectionResult[] = [];
    for (const tx of transactions) {
      const setAuthority = DrainerDetector.detectSetAuthority(tx);
      if (setAuthority) detections.push(setAuthority);
      
      const unlimitedApproval = DrainerDetector.detectUnlimitedApproval(tx);
      if (unlimitedApproval) detections.push(unlimitedApproval);
      
      const known = await DrainerDetector.detectKnownDrainer(
        tx,
        async (addr: string) => await anchorClient.isKnownDrainer(addr),
        getDomainsForAddress
      );
      if (known) detections.push(known);
    }
    
    const report = RiskAggregator.aggregateRisk(detections, {
      walletAddress: address,
      transactionCount: transactions.length,
      transactions: transactions,
      includeExperimental: experimental,
    });
    
    return c.json({
      success: true,
      type: 'wallet_analysis',
      data: report,
      timestamp: Date.now(),
    });
  }
);

// Error handling
app.onError((err, c) => {
  console.error('API Error:', err);
  
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
```

**Hono-Specific Features Used:**
- `zValidator` for type-safe query parameter validation
- Middleware chain for clean separation of concerns
- `c.req.valid('query')` for typed access to validated data
- `HTTPException` for proper error handling
- Context (`c`) for passing data between middleware

**Integration Points:**
- Reuse `AnchorClient.getDrainerReport()` for drainer checks
- Reuse `HeliusClient` and `DrainerDetector` for wallet analysis
- Reuse `RiskAggregator` for risk calculation

---

## 6. Frontend API Documentation Page

### 5.1 Page Structure

**Route:** `/api` or `/docs/api`

**Sections:**
1. **Overview** - What the API does
2. **Authentication** - User-Agent requirements
3. **Rate Limits** - Tier explanations
4. **Endpoints** - Detailed endpoint documentation
5. **Examples** - Code examples in multiple languages
6. **Error Handling** - Error codes and responses
7. **Contact** - How to request higher rate limits

### 5.2 Documentation Content

#### 5.2.1 Overview Section
- Brief description of the API
- Use cases
- Benefits of proper User-Agent identification

#### 5.2.2 Authentication Section
- User-Agent format requirements
- Examples of valid/invalid user agents
- API key information (future)

#### 5.2.3 Rate Limits Section
- Table of rate limit tiers
- How to qualify for each tier
- Rate limit headers explanation
- How to request higher limits

#### 5.2.4 Endpoints Section
- **GET /api/v1/check**
  - Description
  - Parameters
  - Response schemas
  - Example requests/responses
  - Error codes

#### 5.2.5 Examples Section
- cURL examples
- JavaScript/TypeScript examples
- Python examples
- Go examples (if relevant)

#### 5.2.6 Error Handling Section
- HTTP status codes
- Error response format
- Common error scenarios
- Rate limit exceeded handling

### 5.3 Frontend Implementation with Scalar

**API Documentation Tool:** [Scalar API Reference](https://guides.scalar.com/scalar/scalar-api-references/integrations/htmljs)

**Implementation Approach:**
- Manually/statically type the OpenAPI specification
- Use Scalar's HTML/JS integration for interactive API documentation
- Embed Scalar component in Astro page

**File Structure:**
```
packages/frontend/src/
├── pages/
│   └── api.astro              # API documentation page with Scalar
├── components/
│   └── ScalarApiRef.svelte    # Scalar API Reference component wrapper
└── lib/
    └── openapi-spec.ts        # Manually typed OpenAPI specification
```

**Scalar Integration (HTML/JS):**

```astro
---
// packages/frontend/src/pages/api.astro
import Layout from '../layouts/Layout.astro';
---

<Layout>
  <div id="scalar-api-reference"></div>
  
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  <script>
    Scalar.createApiReference('#scalar-api-reference', {
      // OpenAPI spec URL (served from API)
      url: '/api/openapi.json',
      
      // Or use content directly
      // content: openApiSpec,
      
      // Configuration
      theme: 'dark',
      layout: 'modern',
      hideClientButton: false,
      showSidebar: true,
      
      // Customization
      metaData: {
        title: 'Have I Been Drained API',
        description: 'Public API for checking Solana wallet security',
      },
      
      // Servers
      servers: [
        {
          url: 'https://api.haveibeendrained.org',
          description: 'Production',
        },
        {
          url: 'http://localhost:3001',
          description: 'Development',
        },
      ],
      
      // Authentication
      authentication: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    });
  </script>
</Layout>
```

**OpenAPI Specification Structure:**

The OpenAPI spec will be manually typed and include:
- All endpoints (`/api/v1/check`, `/api/v1/drainer/:address`, `/api/v1/analyze/:address`)
- Request/response schemas
- Rate limiting information
- Authentication requirements
- Error responses
- Examples

**Design Considerations:**
- Scalar provides built-in dark theme support
- Interactive API explorer with "Try it out" functionality
- Automatic code generation for multiple languages
- Search functionality built-in
- Mobile-responsive by default
- Copy-to-clipboard for code examples

---

## 7. Testing Strategy

### 6.1 Unit Tests

- User-Agent parser validation
- Rate limit tier determination
- Address validation
- Response schema validation

### 6.2 Integration Tests

- Endpoint with valid drainer address
- Endpoint with regular wallet address
- Rate limiting enforcement
- Error handling scenarios

### 6.3 Load Tests

- Rate limit enforcement under load
- Concurrent request handling
- Redis/rate limiter performance

---

## 8. Deployment Considerations

### 7.1 Environment Variables

```bash
# Rate Limiting (Redis from docker-compose)
REDIS_HOST=redis  # docker-compose service name
REDIS_PORT=6379

# API Keys
DATABASE_URL=postgresql://...  # For API key storage
API_KEY_ENCRYPTION_SECRET=...  # For hashing API keys

# Email (for key invalidation)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@haveibeendrained.org

# Feature Flags
ENABLE_PUBLIC_API=true
ENABLE_API_KEY_SYSTEM=true  # MVP - manual key creation
```

### 7.2 Monitoring

- Track rate limit hits/misses
- Monitor API usage by tier
- Alert on abuse patterns
- Track most common user agents

### 7.3 Analytics

- Requests per tier
- Most popular endpoints
- Error rates
- Average response times

---

## 9. Implementation Phases

### Phase 1: Core Endpoint (Week 1)
- [ ] Create `/api/v1/check` unified endpoint
- [ ] Create `/api/v1/drainer/:address` separate endpoint (optional)
- [ ] Create `/api/v1/analyze/:address` separate endpoint (optional)
- [ ] Implement drainer check logic
- [ ] Implement wallet analysis fallback
- [ ] Cache middleware (bypass rate limits for cached responses)
- [ ] Basic error handling
- [ ] Unit tests

### Phase 2: Rate Limiting (Week 1-2)
- [ ] User-Agent parser implementation
- [ ] Rate limiting middleware (per IP and per User-Agent)
- [ ] Redis integration (docker-compose internal network)
- [ ] Cache-aware rate limiting (skip for cached responses)
- [ ] Rate limit headers (RFC 7239 draft)
- [ ] 429 error responses with Retry-After TTL
- [ ] Integration tests

### Phase 3: Frontend Documentation (Week 2)
- [ ] Create API documentation page
- [ ] Add code examples
- [ ] Rate limit table
- [ ] Error handling documentation
- [ ] Styling and responsive design

### Phase 4: Polish & Testing (Week 2-3)
- [ ] End-to-end testing
- [ ] Load testing
- [ ] Documentation review
- [ ] Performance optimization
- [ ] Security audit

### Phase 5: API Key System (MVP)
- [ ] Database schema for API keys
- [ ] Manual API key generation (admin tool/script)
- [ ] Key validation middleware
- [ ] Key invalidation endpoint (`POST /api/v1/keys/:keyId/invalidate`)
- [ ] Email service integration (for sending new keys)
- [ ] Admin interface for key management (basic)
- [ ] Contact form integration (for requesting keys)

### Phase 6: OpenAPI Documentation & Scalar Integration
- [ ] Manually type OpenAPI specification
- [ ] Create OpenAPI endpoint (`GET /api/openapi.json`)
- [ ] Integrate Scalar API Reference in frontend
- [ ] Configure Scalar with custom theme
- [ ] Add examples and descriptions
- [ ] Test interactive API explorer

---

## 10. Open Questions & Decisions Needed

### 9.1 Rate Limiting ✅ DECIDED
- ✅ **Redis Provider:** Use Redis from docker-compose internal network (not external Upstash)
- ✅ **Tracking:** Track rate limits per User-Agent AND per IP address
  - IP-based limits are stricter for requests without User-Agent
  - If User-Agent is provided, use the tier-based limits discussed
- ✅ **Rate Limit Exceeded:** Return 429 status code with TTL in Retry-After header
- ✅ **Cached Responses:** Rate limits do NOT apply to cached responses (but good faith usage expected)

### 9.2 User-Agent Format ✅ DECIDED
- ✅ **Format:** Proposed format is fine: `AppName/Version (Contact; OptionalInfo)`
- ✅ **Legacy Clients:** No legacy clients to handle (this is new software)
- ✅ **Strictness:** Format is appropriate for new API

### 9.3 API Key System ✅ DECIDED
- ✅ **Implementation:** MVP - Create keys manually in database ourselves
- ✅ **Key Distribution:** Manual process initially, automated later if needed
- ✅ **Pricing:** Keys are paid if rate limits exceed 1,000 requests/hour
- ✅ **Invalidation:** Implement key invalidation endpoint with email notification (see Section 3.3)

### 9.4 Documentation ✅ DECIDED
- ✅ **Tool:** Use [Scalar API Reference](https://guides.scalar.com/scalar/scalar-api-references/integrations/htmljs)
- ✅ **Integration:** HTML/JS integration in Astro page
- ✅ **Spec:** Manually/statically type the OpenAPI specification
- ✅ **Configuration:** Use Scalar's configuration options for customization

### 9.5 Endpoint Design ✅ DECIDED
- ✅ **Primary:** Unified endpoint (`/api/v1/check`) is preferred
- ✅ **Alternatives:** Can provide separate endpoints for specific use cases:
  - `/api/v1/drainer/:address` - Drainer check only
  - `/api/v1/analyze/:address` - Full analysis only
- ✅ **Versioning:** Use URL versioning (`/api/v1/`, `/api/v2/`, etc.)

---

## 11. Success Metrics

### 10.1 Technical Metrics
- API response time < 2s (P95)
- Rate limiting accuracy: 100%
- Zero false positives in user-agent parsing
- 99.9% uptime

### 10.2 Usage Metrics
- Number of registered vs. unregistered clients
- Average requests per client
- Most popular user agents
- API key adoption rate (when implemented)

### 10.3 Business Metrics
- Developer adoption
- Documentation page views
- Contact requests for higher limits
- Community feedback

---

## 12. Security Considerations

### 11.1 Rate Limit Bypass Prevention
- Rate limits should be enforced server-side
- IP-based fallback for unregistered clients
- Consider CAPTCHA for suspicious patterns

### 11.2 API Key Security
- Keys should be hashed in database
- Rate limit keys should not expose API keys
- Implement key rotation mechanism

### 11.3 Input Validation
- Strict address validation
- Parameter sanitization
- Request size limits

### 11.4 Abuse Prevention
- Monitor for abuse patterns
- Automatic blocking of abusive IPs
- Alert system for unusual traffic

---

## 13. Documentation Examples

### 12.1 cURL Example

```bash
# Unregistered (lower rate limit)
curl "https://api.haveibeendrained.org/api/v1/check?address=ABC123..."

# Registered (higher rate limit)
curl "https://api.haveibeendrained.org/api/v1/check?address=ABC123..." \
  -H "User-Agent: MyApp/1.0.0 (contact@example.com)"
```

### 12.2 JavaScript Example

```javascript
const response = await fetch(
  'https://api.haveibeendrained.org/api/v1/check?address=ABC123...',
  {
    headers: {
      'User-Agent': 'MyApp/1.0.0 (contact@example.com)'
    }
  }
);

const data = await response.json();
console.log('Rate limit remaining:', response.headers.get('RateLimit-Remaining'));
```

### 12.3 Python Example

```python
import requests

headers = {
    'User-Agent': 'MyApp/1.0.0 (contact@example.com)'
}

response = requests.get(
    'https://api.haveibeendrained.org/api/v1/check',
    params={'address': 'ABC123...'},
    headers=headers
)

data = response.json()
print(f"Rate limit remaining: {response.headers.get('RateLimit-Remaining')}")
```

---

## 14. Next Steps

1. **Review this plan** with the team
2. **Decide on open questions** (Section 9)
3. **Set up development environment** (Redis, etc.)
4. **Create implementation tickets** based on phases
5. **Start Phase 1** implementation

---

## Appendix: Related Files

### Codebase References
- `packages/api/src/routes/analyze.ts` - Existing wallet analysis endpoint
- `packages/api/src/routes/report.ts` - Existing drainer report endpoints
- `packages/api/src/services/anchor-client.ts` - Drainer registry client
- `packages/api/src/index.ts` - Main Hono app entry point
- `packages/frontend/src/pages/index.astro` - Frontend structure reference

### Research & Documentation
- `research/10/rate-limit-code.md` - Rate limiting implementation research
- `research/10/rate-limit-impl.md` - Quick integration guide
- `research/10/rate-limiting-guide.md` - Comprehensive rate limiting guide
- `hono-llms.md` - Hono framework documentation and patterns

### Hono-Specific Resources
- **Rate Limiting:** Use `hono-rate-limiter` with `@hono-rate-limiter/redis`
- **Validation:** Use `@hono/zod-validator` for type-safe validation
- **OpenAPI:** Use `@hono/zod-openapi` for API documentation generation
- **Testing:** Use `hono/testing` for E2E testing
- **Error Handling:** Use `HTTPException` from `hono/http-exception`

### Integration with Existing Code
The new public API endpoint will:
1. Reuse existing `AnchorClient` for drainer checks
2. Reuse existing `HeliusClient` for transaction fetching
3. Reuse existing `DrainerDetector` and `RiskAggregator` for analysis
4. Follow the same Hono patterns as existing routes
5. Mount in `packages/api/src/index.ts` using `app.route('/api/v1', publicApiRoutes)`

