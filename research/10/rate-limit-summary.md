# Rate Limiting & Anti-Spam: Executive Summary & Recommendations
**Have I Been Drained - Implementation Strategy**

---

## QUICK DECISION FRAMEWORK

### Which Rate Limiting Algorithm Should I Use?

```
START
  ↓
Is this a distributed system (multiple servers)?
  ├─ YES → Do you have Redis available?
  │  ├─ YES → Sliding Window Counter with Redis ⭐ RECOMMENDED
  │  └─ NO → Token Bucket (in-memory, per-server)
  │
  └─ NO → Single server application?
     └─ Token Bucket or Sliding Window Counter ✅ Either works
```

**For "Have I Been Drained":** 
→ **Sliding Window Counter with Redis (Upstash)**
- Accurate rate limiting without boundary spikes
- Distributed across Cloudflare Workers
- Free tier supports ample requests
- Atomic operations prevent race conditions

---

### Which CAPTCHA Should I Use?

```
START
  ↓
Do you need GDPR compliance?
  ├─ YES → Cloudflare Turnstile ⭐ BEST CHOICE
  │        (free, private, frictionless)
  │
  └─ NO → Do you already use Google services?
     ├─ YES → Google reCAPTCHA v3
     │        (familiar, but data collection)
     │
     └─ NO → Privacy important?
        ├─ YES → Cloudflare Turnstile or hCaptcha
        └─ NO → Google reCAPTCHA (most tested)
```

**For "Have I Been Drained":**
→ **Cloudflare Turnstile**
- Free: 1M assessments/month (enough for MVP)
- GDPR-compliant (important for Europe)
- Invisible, frictionless UX
- Tight Cloudflare integration

---

## IMPLEMENTATION ROADMAP

### Phase 1: MVP (Week 1-2)
**Goal:** Basic rate limiting without CAPTCHA

- [x] Install `hono-rate-limiter` with Upstash Redis
- [x] Configure 3 tier levels (anonymous, free, pro)
- [x] Add per-endpoint limits
- [x] Return proper 429 responses with headers
- [x] Test with load testing tool

**Time to implement:** 4-6 hours

---

### Phase 2: User Experience (Week 2-3)
**Goal:** Add CAPTCHA and smart detection

- [x] Integrate Cloudflare Turnstile
- [x] Implement conditional CAPTCHA triggering
- [x] Add suspicious activity detection
- [x] Create whitelist for trusted partners
- [x] Build API key system for users

**Time to implement:** 8-10 hours

---

### Phase 3: Production Hardening (Week 3-4)
**Goal:** Monitoring and edge cases

- [x] Add monitoring/alerting for high usage
- [x] Configure Cloudflare WAF rules (if Pro)
- [x] Implement circuit breaker for RPC failover
- [x] Add comprehensive logging
- [x] Performance testing at scale
- [x] Documentation for API consumers

**Time to implement:** 10-12 hours

---

## SPECIFIC RECOMMENDATIONS FOR YOUR USE CASE

### Solana Wallet Security Checker

**Unique Challenges:**
- Heavy RPC consumption (expensive calls to Solana blockchain)
- Potential for abuse (scanning random addresses)
- Mix of free users and premium subscribers
- Bot detection critical (prevent automated draining detection)

### Recommended Limits

```
WALLET CHECK ENDPOINT (/api/v1/wallets/:address)
├─ Anonymous: 5 requests/minute, 50/hour
├─ Free tier: 30 requests/minute, 500/hour
├─ Pro tier: 200 requests/minute, 5000/hour
└─ Enterprise: Custom (unlimited with API key)

HISTORICAL DATA (/api/v1/wallets/:address/transactions)
├─ Anonymous: 2 requests/minute, 20/hour (CAPTCHA required)
├─ Free tier: 10 requests/minute, 100/hour
├─ Pro tier: 100 requests/minute, 1000/hour
└─ Enterprise: Custom

REPORT DRAIN (/api/v1/drains/report)
├─ Anonymous: BLOCKED (must verify email + CAPTCHA)
├─ Free tier: 5 requests/hour (CAPTCHA on first report)
├─ Pro tier: 50 requests/hour
└─ Enterprise: 500 requests/hour
```

### Bot Detection Strategy

**Trigger CAPTCHA when:**
1. Account created < 30 minutes ago
2. > 50 requests in 5-minute window
3. Trying same endpoint repeatedly (possible scanning)
4. Unusual geographic patterns
5. Anonymous user attempting premium operations

```typescript
// Example bot detection logic
const isSuspiciousActivity = async (c) => {
  const ip = c.req.header('cf-connecting-ip');
  const endpoint = new URL(c.req.url).pathname;
  
  // Check for scanning behavior
  const recentEndpoints = await redis.lrange(
    `endpoints:${ip}:recent`,
    0,
    -1
  );
  
  if (recentEndpoints.length > 20) {
    // More than 20 different endpoints in last minute
    return true;
  }
  
  // Check for rapid address lookups (potential vulnerability scanner)
  const addressPattern = /\/wallets\/[1-9A-HJ-NP-Z]{44}/;
  if (addressPattern.test(endpoint)) {
    const count = await redis.incr(`address_lookups:${ip}`);
    if (count === 1) {
      await redis.expire(`address_lookups:${ip}`, 60);
    }
    if (count > 30) {
      return true; // Scanning behavior detected
    }
  }
  
  return false;
};
```

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼───────┐
                    │ Cloudflare   │
                    │ WAF/Workers  │ ◄─ Global rate limiting
                    │              │    (free tier available)
                    └──────┬───────┘
                           │
                    ┌──────▼────────────┐
                    │  Hono API Server  │
                    │  (Cloudflare      │
                    │   Workers or      │
                    │   Deployed)       │
                    └──────┬────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐   ┌──────▼──────┐
   │ Rate     │      │ CAPTCHA     │   │ Check Auth  │
   │ Limiter  │      │ Verification│   │ & Tier      │
   │ (Redis)  │      │ (Turnstile) │   │ (JWT/API)   │
   └────┬─────┘      └──────┬──────┘   └──────┬──────┘
        │                   │                  │
        └─────────────┬─────┴──────────────────┘
                      │
              ┌───────▼────────┐
              │  Upstash Redis │
              │  (Rate Limit   │
              │   Storage)     │
              └────────────────┘
```

---

## COST BREAKDOWN (December 2025)

### Free Tier Sufficient for MVP?

```
Free Tier Capacity (per month):
├─ Upstash Redis: 10,000 commands/day (~300k/month)
├─ Cloudflare Turnstile: 1M assessments/month
├─ Hono: 100,000 requests/day (~3M/month)
└─ Solana RPC: Helius free tier (5,000 credits/month)

Typical MVP Usage:
├─ 1,000 users × 50 requests/day = 50k requests/day
├─ Rate limit checks: 100k Redis commands/day
├─ CAPTCHA on 5% of requests = 2,500/month
└─ TOTAL: Well within free tier ✅
```

### When to Upgrade?

| Usage Level | Monthly Cost | Recommendation |
|-------------|------------|-----------------|
| < 100k req/day | $0 (free tier) | Stay on free tier |
| 100k-1M req/day | $20-50 | Upstash Pro tier needed |
| 1M-10M req/day | $50-200 | Dedicated infrastructure |
| 10M+ req/day | $200+ | Enterprise solutions |

---

## IMPLEMENTATION CHECKLIST - PRIORITY ORDER

### MUST HAVE (Week 1)
- [ ] Rate limiter installed and configured
- [ ] Upstash Redis connected and working
- [ ] Basic limits per endpoint
- [ ] 429 responses with proper headers
- [ ] RateLimit-* headers included

### SHOULD HAVE (Week 2)
- [ ] Cloudflare Turnstile integrated
- [ ] User authentication integration
- [ ] Different limits per tier
- [ ] CAPTCHA on sensitive endpoints
- [ ] Basic monitoring/logging

### NICE TO HAVE (Week 3+)
- [ ] Bot detection system
- [ ] Suspicious activity alerts
- [ ] Whitelist system for partners
- [ ] API key management dashboard
- [ ] Advanced analytics

---

## MONITORING DASHBOARD QUERIES

**Key Metrics to Track:**

```sql
-- Top IPs by request count (past hour)
SELECT 
  client_ip,
  COUNT(*) as request_count,
  COUNT(CASE WHEN status_code = 429 THEN 1 END) as blocked_count,
  ROUND(100.0 * COUNT(CASE WHEN status_code = 429 THEN 1 END) / COUNT(*), 2) as block_rate
FROM rate_limit_events
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY client_ip
ORDER BY request_count DESC
LIMIT 10;

-- CAPTCHA success rate
SELECT 
  DATE(created_at) as date,
  SUM(CASE WHEN verified = true THEN 1 ELSE 0 END) as verified,
  SUM(CASE WHEN verified = false THEN 1 ELSE 0 END) as failed,
  COUNT(*) as total,
  ROUND(100.0 * SUM(CASE WHEN verified = true THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM captcha_verifications
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;

-- Endpoints approaching limits
SELECT 
  endpoint,
  tier,
  COUNT(*) as request_count,
  ROUND(COUNT(*) / 60.0, 2) as req_per_minute,
  CASE 
    WHEN tier = 'anonymous' AND COUNT(*) > 5 * 60 THEN 'WARNING'
    WHEN tier = 'free' AND COUNT(*) > 30 * 60 THEN 'WARNING'
    WHEN tier = 'pro' AND COUNT(*) > 200 * 60 THEN 'WARNING'
    ELSE 'OK'
  END as status
FROM rate_limit_events
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY endpoint, tier
ORDER BY request_count DESC;
```

---

## TROUBLESHOOTING GUIDE

### Problem: Rate Limiting Too Strict

**Symptom:** Legitimate users hitting rate limit

**Solutions:**
1. Check user's tier (may need upgrade)
2. Increase limits if below expected usage
3. Add to whitelist if VIP user
4. Implement sliding window (more forgiving than fixed window)

```typescript
// Quick fix: Increase limits
const RATE_LIMITS = {
  STRICT: { windowMs: 60000, limit: 20 },     // Was 10
  MODERATE: { windowMs: 60000, limit: 60 },   // Was 30
};
```

---

### Problem: CAPTCHA Not Triggering

**Symptom:** Bots still abusing API

**Check:**
1. Verify Turnstile credentials
2. Confirm conditional CAPTCHA logic
3. Check browser console for JS errors
4. Ensure token is being submitted

```typescript
// Debug helper
const debugCaptcha = async (c) => {
  const body = await c.req.json();
  console.log('CAPTCHA token:', body['cf-turnstile-response'] ? '✓' : '✗');
  console.log('Request IP:', c.req.header('cf-connecting-ip'));
  console.log('User ID:', c.get('userId'));
};
```

---

### Problem: Redis Connection Timeout

**Symptom:** Rate limiting not working, requests fail

**Solutions:**
1. Check Upstash URL and token
2. Verify network access (Cloudflare Workers may have restrictions)
3. Implement fallback to in-memory store
4. Add retry logic with exponential backoff

```typescript
// Fallback to in-memory if Redis fails
let useMemoryStore = false;

try {
  await redis.ping();
} catch (error) {
  console.warn('Redis unavailable, using memory store');
  useMemoryStore = true;
}

const store = useMemoryStore
  ? new MemoryStore()
  : new RedisStore({ client: redis });
```

---

## API DOCUMENTATION FOR CONSUMERS

### Rate Limit Headers

Include in your API documentation:

```markdown
## Rate Limiting

All API requests are subject to rate limiting. The following headers are 
included in every response:

- `RateLimit-Limit`: Maximum requests allowed in the current window
- `RateLimit-Remaining`: Number of requests remaining in current window
- `RateLimit-Reset`: Unix timestamp when the limit resets

When you exceed the rate limit, you'll receive a **429 Too Many Requests** 
response with a `Retry-After` header indicating how many seconds to wait.

### Example Response Headers

```
RateLimit-Limit: 100
RateLimit-Remaining: 42
RateLimit-Reset: 1702020300
Retry-After: 45
```

### Best Practices

1. **Check headers before rate limiting:** Monitor `RateLimit-Remaining` 
2. **Implement backoff:** Wait `Retry-After` seconds before retrying
3. **Use API keys:** Higher limits for authenticated requests
4. **Upgrade your tier:** Pro users have 10x higher limits
5. **Cache results:** Avoid redundant requests
```

---

## SECURITY CONSIDERATIONS

### DoS Protection Strategy

```typescript
// Multi-layer defense
const defenseStrategy = {
  // Layer 1: Cloudflare WAF (prevent obvious attacks)
  cloudflareWaf: 'Enabled',
  
  // Layer 2: Cloudflare Workers rate limiting
  cloudflareWorkers: {
    enabled: true,
    limitsPerMinute: 1000
  },
  
  // Layer 3: Application level rate limiting
  appLevel: {
    enabled: true,
    limitsPerMinute: 100,  // Per user/IP
    trackingBackend: 'Redis'
  },
  
  // Layer 4: CAPTCHA for suspicious patterns
  captcha: {
    enabled: true,
    triggers: ['rapid_requests', 'new_account', 'scanning_behavior']
  },
  
  // Layer 5: Circuit breaker for RPC
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    timeout: 30000  // 30 seconds
  }
};
```

---

## SUCCESS METRICS

Track these to measure effectiveness:

```
✓ Rate limit blocks per day: Should increase with bot activity
✓ CAPTCHA success rate: Should stay > 95% for legitimate users
✓ False positive rate: Should be < 1%
✓ API availability: Should be > 99.9%
✓ Response time: Should be < 200ms (excluding RPC calls)
✓ Cost per request: Should decrease as cache hits increase
```

---

## FINAL RECOMMENDATIONS

### For MVP Launch
1. ✅ Use Cloudflare Turnstile (free, GDPR-compliant)
2. ✅ Implement Sliding Window Counter with Upstash Redis
3. ✅ Set conservative limits initially, increase based on usage
4. ✅ Add CAPTCHA for report/creation endpoints only
5. ✅ Skip complex bot detection (too many false positives)

### For Production Scale
1. ✅ Add tier-based limits (free/pro/enterprise)
2. ✅ Implement bot detection with suspicious activity patterns
3. ✅ Set up comprehensive monitoring and alerting
4. ✅ Add API key system for power users
5. ✅ Consider Cloudflare Pro ($25/month) for advanced WAF rules

### Avoid These Mistakes
1. ❌ Too aggressive rate limiting (blocks legitimate users)
2. ❌ Relying only on IP-based limiting (breaks NAT users)
3. ❌ Forgetting to include Retry-After header
4. ❌ Using fixed window algorithm (boundary spike issue)
5. ❌ Triggering CAPTCHA on every request (kills UX)

---

**Prepared:** December 2025
**For:** Have I Been Drained Hackathon
**Status:** Ready to implement