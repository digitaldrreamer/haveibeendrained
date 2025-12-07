# Solana Blinks Research Summary
## Have I Been Drained - December 2025

---

## Executive Summary

**Solana Blinks** are production-ready as of December 2025 and represent a mature, specification-compliant ecosystem for deploying interactive blockchain actions across social media and web platforms.

### Key Findings:

1. **Specification Status:** Solana Actions v1.0 is finalized and widely adopted
2. **Wallet Support:** 5+ major wallets fully support Blinks (Phantom, Backpack, Solflare, Magic Eden, TrustWallet)
3. **Platform Coverage:** X/Twitter, Discord, Telegram, websites all support rendering
4. **Developer Maturity:** Official SDK (@solana/actions), multiple framework integrations, active community
5. **Cost:** Minimal for small projects (RPC + hosting ≈ $0-20/month on free tiers)
6. **Complexity:** Moderate - straightforward HTTP API with CORS requirements

---

## Technical Implementation Complexity

| Aspect | Complexity | Effort | Risk |
|--------|-----------|--------|------|
| **Basic Action** | Low | 2-4 hours | Very Low |
| **Parameter Handling** | Low | 1-2 hours | Very Low |
| **Error Handling** | Medium | 3-5 hours | Low |
| **Multi-Platform Testing** | Medium | 4-6 hours | Low |
| **Production Deployment** | Low | 1-2 hours | Very Low |
| **Total MVP** | **Low** | **8-16 hours** | **Very Low** |

**Recommendation for "Have I Been Drained":**
- **Donate Action**: 3-4 hours (simple SOL transfer)
- **Drain Check Action**: 4-5 hours (wallet analysis + UI)
- **Platform Testing**: 2-3 hours (X, Discord, Phantom, Backpack)
- **Total: 10-12 hours for both actions**

---

## Critical Implementation Requirements

### 1. HTTP Headers (NON-NEGOTIABLE)
```
EVERY endpoint + actions.json MUST have:
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Methods: GET,POST,PUT,OPTIONS
- Access-Control-Allow-Headers: Content-Type, Authorization, Content-Encoding, Accept-Encoding
```

### 2. Required Files
```
✅ actions.json at https://yourdomain.com/actions.json
✅ Meta tags in HTML (OG, Twitter Card)
✅ GET endpoint returning ActionGetResponse
✅ POST endpoint accepting ActionPostRequest
✅ OPTIONS endpoint for CORS preflight
```

### 3. Transaction Requirements
```
✅ recentBlockhash included
✅ feePayer set to userPublicKey
✅ requireAllSignatures: false
✅ Base64 encoding for response
```

---

## Specification Overview

### GET Response Structure
```typescript
{
  type: 'action',
  icon: 'https://yourdomain.com/icon.png',
  title: 'Action Title',
  description: 'Brief description',
  label: 'Button Text',
  links?: {
    actions: [
      {
        label: 'Option 1',
        href: '/api/endpoint?param={value}',
        parameters: [{ name: 'value', label: 'Label', required: true }],
      },
    ],
  },
}
```

### POST Request/Response
```typescript
// REQUEST
{ account: 'user_wallet_address' }

// RESPONSE
{
  transaction: 'base64_encoded_tx',
  message: 'Transaction description',
  links?: {
    next?: { type: 'completed', icon, title, description, label }
  }
}
```

---

## Platform Support Matrix

| Platform | Status | Details |
|----------|--------|---------|
| **X/Twitter** | ✅ Full | Unfurls automatically, rich preview |
| **Discord** | ✅ Full | Bot expansion, inline buttons |
| **Telegram** | ✅ Via Bot | Requires bot setup |
| **Phantom Wallet** | ✅ Full | Extension + mobile |
| **Backpack** | ✅ Full | Native integration |
| **Web3 Dapps** | ✅ Full | @solana/actions SDK |
| **Farcaster** | ⏳ Early | Limited support |

**No limitations detected for "Have I Been Drained" use case.**

---

## Recommended Architecture

### Frontend (Astro + Svelte)
```
src/
├── pages/
│   ├── index.astro          # Landing
│   └── api/
│       ├── actions.json.ts  # Mapping file
│       └── actions/
│           ├── donate.ts
│           └── check.ts
├── components/
│   └── BlinkDisplay.svelte  # Action UI
└── api/
    ├── cors.ts              # CORS utility
    └── actions/
        ├── donate.ts        # Donate logic
        └── check.ts         # Check logic
```

### Backend (Hono)
```
- Lightweight HTTP framework
- Works seamlessly with Astro
- CORS handling simplified
- Type-safe request/response
```

### Database (PostgreSQL via Supabase)
```
- Track donations
- Store drain detection results
- Community reporting data
- User feedback
```

---

## Library & Tool Recommendations

### Official
- `@solana/actions` - Type-safe action building
- `@solana/web3.js` - Transaction creation
- `@solana/spl-token` - Token operations (if needed)

### Testing
- `curl` - Quick local testing
- `https://dial.to` - Blink simulator
- `Phantom/Backpack` - Real wallet testing
- `https://imgsrc.io/tools/open-graph-debugger` - Meta tag validation

### Hosting (Free Tier)
- **Vercel** - Astro + API routes
- **Supabase** - PostgreSQL (500MB free)
- **Helius** - RPC endpoint (10K req/day free)

---

## Cost Analysis

### Monthly Operating Costs (Typical)

**Scenario: 50K monthly Blinks interactions**

| Component | Service | Cost | Notes |
|-----------|---------|------|-------|
| **RPC** | Helius | $0 | Free tier covers usage |
| **Hosting** | Vercel | $0 | Free tier sufficient |
| **Database** | Supabase | $0 | 500MB free tier |
| **Storage** | Backblaze B2 | $0.30 | ~20MB usage |
| **Domain** | Namecheap | $8.88 | Annual: ~$0.74/month |
| **Monitoring** | Sentry | $0 | Free tier |
| **Total** | | **~$1** | Actually profitable if donations cover costs |

**Scaling Cost Example: 5M monthly interactions**
- RPC: $200-300 (Helius or QuickNode)
- Hosting: $20-40 (Vercel Pro)
- Database: $25-50 (Supabase Pro)
- Storage: $0.75 (20GB)
- **Total: ~$300/month**

---

## Security Considerations

### Input Validation
```typescript
✅ Validate wallet address (try/catch PublicKey constructor)
✅ Validate numeric parameters (isNaN, min/max checks)
✅ Validate URL parameters against patterns
✅ Never trust client input for transaction logic
```

### Secrets Management
```typescript
✅ Store wallet addresses in environment variables
✅ Never expose RPC keys in client code
✅ Use secure random for any nonces
✅ Validate transactions on-chain before logging
```

### CORS & HTTPS
```typescript
✅ CORS: Always use '*' for public actions (standard practice)
✅ HTTPS: Required on all production endpoints
✅ No hardcoded URLs: Use dynamic baseUrl
```

---

## Testing Strategy

### Unit Tests
```
✓ Parameter validation
✓ Transaction creation
✓ Serialization
✓ Error handling
```

### Integration Tests
```
✓ GET endpoint returns valid schema
✓ POST creates valid transaction
✓ CORS headers present
✓ Error responses formatted correctly
```

### E2E Tests (Manual)
```
✓ Phantom wallet signing
✓ Backpack wallet signing
✓ X/Twitter unfurl
✓ Discord embed
✓ dial.to simulation
```

### Performance Tests
```
✓ GET response < 500ms
✓ POST response < 2s
✓ No memory leaks
✓ Connection pooling working
```

---

## Deployment Checklist

### Code Ready
- [ ] All endpoints implemented
- [ ] CORS headers configured
- [ ] Error handling complete
- [ ] Input validation done
- [ ] Tests passing

### Environment
- [ ] Production RPC URL set
- [ ] Wallet address configured
- [ ] Environment variables secure
- [ ] HTTPS enabled
- [ ] Database migrated

### Testing
- [ ] Tested in Phantom
- [ ] Tested in Backpack
- [ ] Tested in Discord
- [ ] Tested in X/Twitter
- [ ] OG meta tags valid

### Monitoring
- [ ] Error logging configured
- [ ] Rate limiting active
- [ ] Metrics collected
- [ ] Alerts setup
- [ ] Documentation ready

---

## Common Mistakes (Avoid These!)

### 1. Missing CORS Headers ⚠️
**Impact:** Blinks won't render in any client  
**Fix:** Set headers on EVERY endpoint

### 2. Missing actions.json ⚠️
**Impact:** Normal URLs won't be mapped to actions  
**Fix:** Create at domain root (not /api/)

### 3. requireAllSignatures: true ❌
**Impact:** User can't sign transaction  
**Fix:** Always use `requireAllSignatures: false`

### 4. No recentBlockhash ❌
**Impact:** Transaction fails immediately  
**Fix:** Always call `getLatestBlockhash('finalized')`

### 5. HTTP Instead of HTTPS ❌
**Impact:** Wallets reject URL  
**Fix:** Use HTTPS everywhere in production

### 6. Exposing Secrets ❌
**Impact:** Wallet compromise  
**Fix:** Use environment variables only

---

## Success Metrics

### For "Have I Been Drained" Blinks:

**Short Term (Week 1-2):**
- ✅ Actions deployed and accessible
- ✅ All error cases handled
- ✅ Platform testing complete
- ✅ Documentation published

**Medium Term (Month 1):**
- ✅ 100+ donations via Blinks
- ✅ 500+ wallet checks performed
- ✅ < 100ms average response time
- ✅ 99%+ uptime

**Long Term (Quarter 1):**
- ✅ Action chaining implemented
- ✅ Community reporting integration
- ✅ Multi-language support
- ✅ Analytics dashboard

---

## Next Steps

### Immediate (This Week)
1. Set up Astro + Hono project
2. Implement donation action (donate.ts)
3. Test with Phantom locally
4. Deploy to Vercel

### Short Term (Week 2)
1. Implement wallet check action (check.ts)
2. Set up OG meta tags
3. Test across all platforms
4. Create actions.json

### Medium Term (Month 1)
1. Launch Blinks on social media
2. Set up community reporting
3. Implement analytics
4. Optimize based on usage

---

## Resources

### Official Documentation
- https://solana.com/developers/guides/advanced/actions
- https://github.com/solana-developers/solana-actions
- https://www.npmjs.com/package/@solana/actions

### Community Tools
- https://dial.to - Blink simulator/tester
- https://inspector.solana.com - Transaction preview
- https://imgsrc.io/tools/open-graph-debugger - Meta tag tester

### Learning Resources
- YouTube: "How to Build Solana Actions" (official)
- Chainstack Tutorial: "Solana: How to build actions and blinks"
- Forum: https://forum.solana.com (search "actions")

---

## Conclusion

**Solana Blinks are production-ready and highly recommended for "Have I Been Drained."**

### Why Blinks Are Perfect for This Project:

1. **Distribution:** Reach users on Twitter, Discord without friction
2. **UX:** One-click security scanning and donations
3. **Cost-Effective:** Minimal infrastructure required
4. **Security:** Transactions signed in wallet, no keys exposed
5. **Viral Potential:** Shareable links drive organic growth
6. **Integration:** Works with existing Solana ecosystem

### Estimated Development Timeline:
- **MVP (Donate + Check):** 10-12 hours
- **Platform Testing:** 3-4 hours
- **Deployment:** 1-2 hours
- **Total:** 2-3 days of focused development

### Risk Assessment:
- **Technical Risk:** 🟢 LOW (mature specification, good SDKs)
- **Deployment Risk:** 🟢 LOW (simple HTTP API)
- **Operational Risk:** 🟢 LOW (minimal infrastructure)
- **User Adoption Risk:** 🟡 MEDIUM (requires Phantom or similar)

---

## Final Recommendation

✅ **PROCEED with Blinks implementation immediately**

The specification is stable, wallet support is excellent, and the developer experience is good. The "Have I Been Drained" use case is well-suited for Blinks (donations + scanning), and the implementation effort is reasonable.

**Target Launch:** December 19, 2025 hackathon deadline is achievable with focused development.

---

**Document Created:** December 7, 2025  
**Specification Version:** Solana Actions v1.0 (December 2025)  
**Recommended Stack:** Astro + Svelte + Hono + Vercel + Helius + Supabase
