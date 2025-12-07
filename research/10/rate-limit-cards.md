# Rate Limiting & Anti-Spam: Visual Reference Cards
**Quick lookup guide for implementation decisions**

---

## ALGORITHM COMPARISON MATRIX

```
┌────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ ALGORITHM          │ ACCURACY │ MEMORY   │ LATENCY  │ BEST FOR │
├────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Token Bucket       │ Good ✓✓  │ Low ✓✓✓  │ Ultra-   │ Variable │
│                    │          │          │ low ✓✓✓  │ traffic  │
├────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Leaky Bucket       │ Perfect  │ Medium   │ Medium   │ Steady   │
│                    │ ✓✓✓      │ ✓✓       │ ✓✓       │ output   │
├────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Fixed Window       │ Poor ✗   │ Very Low │ Ultra-   │ AVOID    │
│ (Deprecated)       │          │ ✓✓✓      │ low ✓✓✓  │ (spikes) │
├────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Sliding Window Log │ Perfect  │ High     │ Low      │ Single   │
│                    │ ✓✓✓      │ ✗        │ ✓✓       │ server   │
├────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Sliding Window     │ Excellent│ Medium   │ Low      │ RECOM-   │
│ Counter ⭐         │ ✓✓✓      │ ✓✓       │ ✓✓       │ MENDED   │
└────────────────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## IMPLEMENTATION DECISION TREE

```
┌─ What type of deployment?
│
├─ Single Server
│  ├─ Low traffic (< 1k req/min)
│  │  └─ Token Bucket (in-memory) ✓
│  │
│  └─ High traffic (> 1k req/min)
│     └─ Sliding Window Counter with Redis ✓
│
└─ Distributed (Multiple servers / Serverless)
   │
   ├─ Have Redis available?
   │  ├─ YES
   │  │  └─ Sliding Window Counter ⭐ BEST
   │  │
   │  └─ NO
   │     └─ Token Bucket (per-server) [NOT IDEAL]
   │
   └─ Using Cloudflare Workers?
      ├─ Free tier
      │  └─ Upstash Redis ✓ (free tier available)
      │
      └─ Pro/Enterprise
         ├─ Cloudflare Workers Rate Limiting API ✓
         └─ + App-level rate limiting ✓ (for precision)
```

---

## RATE LIMIT CONFIGURATION QUICK REFERENCE

### By Use Case

```
┌─────────────────────────┬────────────┬──────────┬──────────────┐
│ ENDPOINT TYPE           │ ANONYMOUS  │ FREE     │ PRO          │
├─────────────────────────┼────────────┼──────────┼──────────────┤
│ Public/Health           │ 100/min    │ 500/min  │ 1000/min     │
│ Wallet Check            │ 5/min      │ 30/min   │ 200/min      │
│ Historical Data         │ 2/min*     │ 10/min   │ 100/min      │
│ CAPTCHA Required        │ 1/min*     │ 5/min    │ 50/min       │
│ Create/Report           │ BLOCKED*   │ 5/hour*  │ 50/hour      │
│ Premium Features        │ BLOCKED    │ 10/hour  │ 200/hour     │
└─────────────────────────┴────────────┴──────────┴──────────────┘
* = CAPTCHA required, ** = Authentication required
```

### By Time Window

```
Per Minute:      Used for most API endpoints
                 (prevents rapid bursts)
                 
Per Hour:        Used for expensive operations
                 (wallet reports, data exports)
                 
Per Day:         Used for accounts
                 (total usage tracking, billing)
```

---

## CAPTCHA COMPARISON CARDS

### Cloudflare Turnstile ⭐ RECOMMENDED

```
┌─────────────────────────────┐
│ Cloudflare Turnstile        │
├─────────────────────────────┤
│ User Experience: ⭐⭐⭐⭐⭐   │
│ Privacy:        ⭐⭐⭐⭐⭐   │
│ Cost:           ⭐⭐⭐⭐⭐   │
│ Performance:    ⭐⭐⭐⭐    │
│ Maturity:       ⭐⭐⭐      │
├─────────────────────────────┤
│ Free Tier: 1M/month         │
│ Type: Invisible, frictionless│
│ Data Collected: Minimal     │
│ GDPR: Compliant ✓           │
│ Setup Time: 5 minutes       │
└─────────────────────────────┘
```

### Google reCAPTCHA v3

```
┌─────────────────────────────┐
│ Google reCAPTCHA v3         │
├─────────────────────────────┤
│ User Experience: ⭐⭐⭐⭐    │
│ Privacy:        ⭐⭐        │
│ Cost:           ⭐⭐⭐      │
│ Performance:    ⭐⭐⭐      │
│ Maturity:       ⭐⭐⭐⭐⭐   │
├─────────────────────────────┤
│ Free Tier: 10k/month        │
│ Type: Invisible score-based │
│ Data Collected: Extensive   │
│ GDPR: Issues ⚠              │
│ Setup Time: 10 minutes      │
└─────────────────────────────┘
```

### hCaptcha (Privacy-First Alternative)

```
┌─────────────────────────────┐
│ hCaptcha                    │
├─────────────────────────────┤
│ User Experience: ⭐⭐⭐      │
│ Privacy:        ⭐⭐⭐⭐⭐   │
│ Cost:           ⭐⭐⭐⭐⭐   │
│ Performance:    ⭐⭐⭐      │
│ Maturity:       ⭐⭐⭐⭐    │
├─────────────────────────────┤
│ Free Tier: Generous         │
│ Type: Puzzle-based          │
│ Data Collected: Minimal     │
│ GDPR: Compliant ✓           │
│ Setup Time: 5 minutes       │
└─────────────────────────────┘
```

---

## SUSPICIOUS ACTIVITY DETECTION FLOWCHART

```
Incoming Request
    ↓
Is user authenticated?
    ├─ NO  → Check IP reputation
    │       ├─ > 50 req/min? → Trigger CAPTCHA
    │       ├─ Multiple endpoints? → Trigger CAPTCHA
    │       └─ Wallet scanning? → Trigger CAPTCHA
    │
    └─ YES → Check account age
            ├─ < 30 minutes? → Trigger CAPTCHA
            │
            └─ > 30 minutes? → Check usage pattern
                              ├─ Normal usage → Allow
                              ├─ Rapid spikes? → Log warning
                              └─ Unusual geo?  → Monitor
```

---

## RESPONSE HEADER QUICK REFERENCE

### Success Response (2xx)

```http
HTTP/1.1 200 OK
Content-Type: application/json
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1702020300
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1702020300

{
  "status": "ok",
  "data": { ... }
}
```

### Rate Limit Exceeded (429)

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 45
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1702020300

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "retryAfter": 45,
  "resetTime": "2024-12-08T12:35:00Z"
}
```

---

## COST ESTIMATION CHART

### Monthly Cost by Request Volume

```
     Cost ($)
       $500 │                          ╱─────
            │                      ╱───
       $200 │                  ╱───
            │              ╱───
       $100 │          ╱───
            │      ╱───
        $50 │  ╱───
            │ ╱
         $0 ├─────────────────────────
            │
            1M   10M  100M  1B   10B  ← Requests/Month
            
          FREE TIER LIMIT  │
          (Hono, Turnstile,│
           Upstash Redis)  │
```

### Services & Pricing

```
┌─────────────────────┬──────────┬──────────┬─────────────┐
│ SERVICE             │ FREE     │ MINIMUM  │ SCALE TIER  │
├─────────────────────┼──────────┼──────────┼─────────────┤
│ Upstash Redis       │ Daily    │ $0.20    │ $1 per 500k │
│                     │ 10k cmds │ /100k    │ commands    │
├─────────────────────┼──────────┼──────────┼─────────────┤
│ Cloudflare Workers  │ 100k     │ FREE     │ $0.50/min   │
│                     │ req/day  │          │             │
├─────────────────────┼──────────┼──────────┼─────────────┤
│ Turnstile CAPTCHA   │ 1M       │ FREE     │ $0.50/1k    │
│                     │ checks   │          │ (Pro+)      │
├─────────────────────┼──────────┼──────────┼─────────────┤
│ Cloudflare Pro      │ Included │ $25      │ WAF Rules   │
│ WAF                 │ in plan  │ /month   │             │
└─────────────────────┴──────────┴──────────┴─────────────┘
```

---

## TESTING CHECKLIST

### Unit Tests

```typescript
✓ Rate limit allows requests within limit
✓ Rate limit rejects requests exceeding limit
✓ Headers are present in response
✓ Retry-After header set on 429
✓ Reset time calculation is correct
✓ Different tiers have different limits
✓ Whitelisted users bypass limits
✓ CAPTCHA token verification works
✓ Suspicious activity detection triggers
```

### Integration Tests

```typescript
✓ Redis connection works
✓ Rate limit persists across requests
✓ Distributed rate limiting syncs across servers
✓ CAPTCHA service responds correctly
✓ Whitelist cache updates correctly
✓ Fallback works if Redis unavailable
```

### Load Tests

```bash
# Test 100 concurrent requests
ab -n 100 -c 100 http://localhost:3000/api/test

# Test burst traffic
wrk -t4 -c100 -d30s http://localhost:3000/api/test

# Test sustained load
hey -n 10000 -c 100 http://localhost:3000/api/test
```

---

## MONITORING METRICS DASHBOARD

```
┌─ REAL-TIME METRICS
│
├─ Request Rate
│  └─ Requests/sec (target: < 1000 for MVP)
│
├─ Error Rate
│  ├─ 429 errors (rate limited)
│  ├─ 500 errors (server errors)
│  └─ 403 errors (CAPTCHA failed)
│
├─ Latency
│  ├─ p50: < 100ms
│  ├─ p95: < 500ms
│  └─ p99: < 1s
│
├─ Cache Metrics
│  ├─ Hit rate
│  └─ Miss rate
│
└─ CAPTCHA Metrics
   ├─ Challenge rate
   ├─ Success rate
   └─ Fraud detection rate
```

---

## COMMON PITFALLS & SOLUTIONS

```
PITFALL                      SOLUTION
─────────────────────────────────────────────────────────────
Too aggressive limits        Start conservative, increase based on data
Wrong key generation         Use authenticated ID when available
No sliding window             Use fixed window = boundary spikes
Missing Retry-After header   Always include for 429 responses
CAPTCHA on every request     Trigger conditionally on suspicious activity
In-memory only               Use Redis for distributed systems
No monitoring                Track: 429s, response time, resource usage
Fail closed on errors        Fail open (allow requests) if rate limiter down
```

---

## DEPLOYMENT READINESS CHECKLIST

```
PRE-DEPLOYMENT
└─ ✓ All dependencies installed
   ✓ Environment variables configured
   ✓ Redis connection tested
   ✓ CAPTCHA service tested
   ✓ Unit tests passing
   ✓ Load tests completed
   ✓ Error handling tested

DURING DEPLOYMENT
└─ ✓ Health check endpoint active
   ✓ Monitoring logs are being collected
   ✓ Rate limiter is functioning
   ✓ CAPTCHA integration verified

POST-DEPLOYMENT
└─ ✓ Monitor error rates (should be ~0%)
   ✓ Check 429 response volume (should be low)
   ✓ Verify headers in responses
   ✓ Test with load tool
   ✓ Monitor Redis usage
   ✓ Check for false positives in CAPTCHA
   ✓ Collect baseline metrics for future comparison
```

---

## QUICK TROUBLESHOOTING GUIDE

```
SYMPTOM               LIKELY CAUSE           QUICK FIX
──────────────────────────────────────────────────────────
429 Too Soon          Limit too strict       Increase limit by 50%
                      
CAPTCHA not showing   Wrong site key         Verify TURNSTILE_SITE_KEY

Redis timeout         Connection issue       Check credentials
                      Wrong credentials      Verify UPSTASH_REDIS_*

High p99 latency      Redis slow            Check Redis usage
                      Too many concurrent   Add caching
                      
Bot traffic           Insufficient filters  Add CAPTCHA triggers

False positives       Detection too strict  Relax thresholds
```

---

## COMPLIANCE CHECKLIST

```
GDPR (Europe)
✓ Use CAPTCHA that respects privacy
  → Cloudflare Turnstile ✓
  → Google reCAPTCHA ✗ (data collection)
✓ Disclose rate limiting in terms
✓ Allow users to request their data

CCPA (California)
✓ Disclose any data collection
✓ Allow users to opt-out
✓ Implement right to deletion

SOC2 (Security)
✓ Log all rate limit events
✓ Monitor for suspicious patterns
✓ Implement circuit breaker
✓ Have incident response plan
```

---

**Print this page for quick reference during implementation!**