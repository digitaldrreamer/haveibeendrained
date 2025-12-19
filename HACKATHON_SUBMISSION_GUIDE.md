# Hackathon Submission Guide 🏆

Complete guide for submitting to Solana Student Hackathon Fall 2025.

## ✅ Completed Tasks

### Phase 1-3: Core Development ✅
- ✅ Anchor Program (on-chain registry)
- ✅ Detection Engine (SetAuthority, Approvals, Known Drainers)
- ✅ Frontend (Landing page, wallet input, results display)
- ✅ Solana Actions (Blinks) implementation

### Phase 4: Integration ✅
- ✅ Frontend → API connection
- ✅ API → Anchor Program connection
- ✅ End-to-end testing script

### Phase 5: Documentation ✅
- ✅ Comprehensive README.md
- ✅ Deployment checklist

---

## 📋 Remaining Tasks

### 1. DEMO-001: Record Demo Video (REQUIRED)

**Duration:** Exactly 3 minutes or less

**Script:**

**[0:00-0:30] The Problem (Hook)**
- "In 2024, Solana wallet drainers stole $300 million from 324,000 users"
- Show real drain transaction on Solscan
- "Current solutions are centralized, slow, and incomplete"

**[0:30-1:30] The Solution (Demo)**
- Open http://localhost:3000 (or production URL)
- Enter a wallet address
- Show real-time analysis (15 seconds)
- Display detected drain patterns:
  - SetAuthority detection
  - Unlimited approvals
  - Known drainer from registry
- Show recovery recommendations

**[1:30-2:30] The Innovation (Technical)**
- "First decentralized drainer registry on Solana"
- Show on-chain report submission:
  ```bash
  curl -X POST http://localhost:3001/api/report \
    -d '{"drainerAddress": "...", "amountStolen": 1.5}'
  ```
- Show Solana Explorer with the transaction
- Explain PDA-based architecture
- Show Solana Actions (Blinks) working

**[2:30-3:00] The Impact (Call to Action)**
- "Protect yourself and others"
- Show GitHub repo URL
- "Built in 12 days for Solana Student Hackathon"
- End with website URL

**Recording Tips:**
- Use screen recording software (OBS, Loom, etc.)
- Clear audio (use good microphone)
- Smooth transitions
- Highlight key features
- Show actual working demo (not mockups)

---

### 2. INTEGRATION-003: Run End-to-End Tests

**Command:**
```bash
cd packages/api
bun run test:e2e
```

**What to do:**
1. Add 10 safe wallet addresses to `SAFE_WALLETS` array
2. Add 10 drained wallet addresses to `DRAINED_WALLETS` array
3. Run the test script
4. Verify 90%+ accuracy
5. Fix any issues found

**Finding Test Wallets:**
- Safe wallets: Use your own, or known safe addresses
- Drained wallets: Check Solana security forums, or report some test addresses first

---

### 3. DEPLOY-001: Production Deployment

**Follow:** `DEPLOYMENT_CHECKLIST.md`

**Quick Steps:**

1. **Deploy Frontend (Vercel)**
   ```bash
   cd packages/frontend
   npm i -g vercel
   vercel login
   vercel --prod
   ```

2. **Deploy API (VPS/Railway/Render)**
   - Follow deployment checklist
   - Update CORS settings
   - Configure environment variables

3. **Update URLs**
   - Update README.md with production URLs
   - Update frontend `.env` with production API URL

---

### 4. SUBMIT-001: Final Submission

**Hackathon Portal Requirements:**
- [ ] GitHub repository (public, MIT license)
- [ ] Demo video (3 minutes max, YouTube/Vimeo link)
- [ ] Live demo URL (frontend)
- [ ] Program ID (Anchor program on devnet/mainnet)
- [ ] Project description
- [ ] Team information

**Submission Checklist:**
- [ ] Repository is public
- [ ] README.md is comprehensive
- [ ] LICENSE file exists (MIT)
- [ ] Demo video uploaded and linked
- [ ] All URLs working
- [ ] Program deployed and verified
- [ ] Submission form completed
- [ ] Tweet about submission (optional but recommended)

**Submission Template:**
```
Project Name: Have I Been Drained?
Category: Security & Community Infrastructure
GitHub: https://github.com/yourusername/haveibeendrained
Demo Video: https://youtube.com/watch?v=...
Live Demo: https://haveibeendrained.vercel.app
Program ID: BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2 (Devnet)

Description:
Have I Been Drained? is the first decentralized, on-chain drainer 
registry on Solana. It provides real-time wallet security analysis 
and allows anyone to report drainers to an immutable on-chain registry.

Key Features:
- On-chain drainer registry via Anchor program
- Real-time transaction analysis
- Multi-pattern detection (SetAuthority, approvals, known drainers)
- Solana Actions (Blinks) integration
- Community-powered reporting
```

---

## 🎯 Priority Order

1. **DEMO-001** - Record video (REQUIRED for submission)
2. **INTEGRATION-003** - Run tests and verify accuracy
3. **DEPLOY-001** - Deploy to production
4. **SUBMIT-001** - Submit to hackathon portal

---

## 📝 Quick Commands Reference

```bash
# Run E2E tests
cd packages/api && bun run test:e2e

# Deploy frontend
cd packages/frontend && vercel --prod

# Check API health
curl http://localhost:3001/api/health

# Test analyze endpoint
curl "http://localhost:3001/api/analyze?address=WALLET_ADDRESS"

# Test report endpoint
curl http://localhost:3001/api/report/DRAINER_ADDRESS

# Test Solana Actions
curl http://localhost:3001/api/actions/check
```

---

## 🎬 Demo Video Recording Checklist

- [ ] Screen recording software ready
- [ ] Microphone tested
- [ ] Browser bookmarks cleared (clean demo)
- [ ] Test wallets prepared
- [ ] Solana Explorer tabs ready
- [ ] Script reviewed
- [ ] Practice run completed
- [ ] Final recording done
- [ ] Video edited (if needed)
- [ ] Uploaded to YouTube/Vimeo
- [ ] Link ready for submission

---

**Good luck with your submission! 🚀**


