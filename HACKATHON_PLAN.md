# Have I Been Drained - Solana Student Hackathon Submission
**Hackathon:** Solana Universities Fall 2025 | **Deadline:** December 19, 2025 | **Days Remaining:** 12

---

## 🎯 Hackathon Positioning

**Category:** Security & Community Infrastructure  
**Innovation:** First decentralized, community-powered wallet security checker on Solana

**Why This Wins:**
1. **Solana-Native Innovation** - On-chain drainer registry (not just another dApp wrapper)
2. **Real Problem** - $300M+ stolen from 324K+ Solana users in 2024-2025
3. **Community Collaboration** - Permissionless reporting creates network effects
4. **Technical Excellence** - Demonstrates Anchor, PDAs, transaction parsing, and Solana Actions

---

## 📋 Hackathon Requirements Checklist

### ✅ Submission Requirements
- [ ] **Open Source** - MIT license, public GitHub repo
- [ ] **Deployed** - Anchor program on devnet (or mainnet if ready)
- [ ] **Demo Video** - 3 minutes MAX (script below)
- [ ] **Innovation** - Reimagines wallet security through decentralization

### 🎥 3-Minute Demo Video Script

**[0:00-0:30] The Problem (Hook)**
- "In 2024, Solana wallet drainers stole $300 million from 324,000 users"
- Show real drain transaction on Solscan
- "Current solutions are centralized, slow, and incomplete"

**[0:30-1:30] The Solution (Demo)**
- Enter a wallet address
- Show real-time analysis (15 seconds)
- Display detected drain patterns (SetAuthority, Approvals, Known Drainers)
- Show recovery recommendations

**[1:30-2:30] The Innovation (Technical)**
- "First decentralized drainer registry on Solana"
- Show on-chain report submission
- Explain PDA-based architecture
- Community-powered network effects

**[2:30-3:00] The Impact (Call to Action)**
- "Protect yourself and others"
- Show GitHub repo
- "Built in 12 days for Solana Student Hackathon"

---

## 🏆 Winning Strategy: Emphasize Solana-Native Features

### What Makes This Solana-Native (Not Just Web3):

1. **On-Chain Registry (Anchor Program)**
   - Permissionless, immutable drainer reports
   - PDA-based account derivation
   - Anti-spam economics (0.01 SOL fee)
   - **This is the star feature for judges**

2. **Solana Actions (Blinks) - INCLUDE THIS**
   - Share wallet checks via Twitter/Discord
   - One-click security analysis
   - Viral growth mechanism
   - **Judges love social integration**

3. **Transaction Pattern Analysis**
   - Parse Solana-specific instructions (SetAuthority, Approve)
   - Understand Token Program vs Token-2022
   - Detect Solana-native attack vectors
   - **Shows deep Solana knowledge**

4. **Community Governance**
   - Anyone can report drainers (permissionless)
   - Reports are transparent and verifiable
   - Network effects: more reports = better protection
   - **Aligns with Solana's decentralization ethos**

---

## 📅 Revised 12-Day Timeline (Hackathon-Optimized)

### Days 1-3: Anchor Program (DEMO CENTERPIECE)
**Goal:** Working on-chain drainer registry

**Why This First:**
- Most impressive for judges (on-chain innovation)
- Critical path for everything else
- Can demo even if frontend isn't perfect

**Tasks:**
- [ ] Initialize Anchor project
- [ ] Implement DrainerReport account (132 bytes)
- [ ] Implement report_drainer instruction with 0.01 SOL fee
- [ ] Write tests (5 core scenarios)
- [ ] Deploy to devnet
- [ ] **Document the innovation** (README section on PDA architecture)

**Demo Highlight:** "Permissionless, immutable drainer registry - first of its kind on Solana"

---

### Days 4-5: Detection Engine (CORE VALUE)
**Goal:** Accurate drain detection

**Tasks:**
- [ ] Helius RPC integration
- [ ] Implement 3 detection patterns:
  1. SetAuthority (CRITICAL - 95% confidence)
  2. Unlimited Approvals (HIGH - 85% confidence)
  3. Known Drainer lookup (CRITICAL - 100% confidence)
- [ ] Risk aggregation and scoring
- [ ] Recovery recommendations

**Demo Highlight:** "Detects 3 critical attack patterns with 90%+ accuracy in under 15 seconds"

---

### Days 6-7: Frontend + Blinks (USER EXPERIENCE)
**Goal:** Beautiful demo + viral sharing

**Tasks:**
- [ ] Astro + Svelte landing page
- [ ] Wallet analysis UI with real-time updates
- [ ] Results visualization (risk meter, attack timeline)
- [ ] **Solana Actions (Blinks)** - CRITICAL FOR HACKATHON
  - Share wallet check via Twitter
  - One-click analysis from social media
  - Viral growth mechanism
- [ ] Mobile-responsive design

**Demo Highlight:** "Share security checks via Solana Actions - protect your community with one click"

---

### Days 8-9: Integration + Polish
**Goal:** Everything works end-to-end

**Tasks:**
- [ ] Connect frontend → API → Anchor program
- [ ] Test with 20 wallets (10 safe, 10 drained)
- [ ] Add loading states and error handling
- [ ] Polish UI (animations, transitions)
- [ ] **Write compelling README** (judges read this!)
- [ ] Create architecture diagram

---

### Days 10-11: Demo Video + Documentation
**Goal:** Perfect 3-minute pitch

**Tasks:**
- [ ] Record demo video (multiple takes)
- [ ] Edit to exactly 3 minutes
- [ ] Add captions and annotations
- [ ] Write detailed README:
  - Problem statement
  - Technical architecture
  - Innovation highlights
  - How to run locally
  - Deployment instructions
- [ ] Create ARCHITECTURE.md explaining PDA design
- [ ] Add inline code comments

**Demo Highlight:** Professional video showcasing innovation

---

### Day 12: Buffer + Submission
**Goal:** Submit with confidence

**Tasks:**
- [ ] Final testing on devnet
- [ ] Fix any critical bugs
- [ ] Verify all hackathon requirements met
- [ ] Submit to hackathon portal
- [ ] Tweet about submission
- [ ] Relax!

---

## 🎯 Revised MVP Scope (Hackathon-Optimized)

### MUST HAVE (For Judges):
1. ✅ **Anchor Program** - On-chain drainer registry (the innovation)
2. ✅ **Detection Engine** - 3 patterns, 90%+ accuracy
3. ✅ **Frontend** - Clean, fast, mobile-responsive
4. ✅ **Solana Actions** - Viral sharing mechanism
5. ✅ **Demo Video** - 3 minutes, compelling narrative
6. ✅ **Documentation** - README, architecture diagram, code comments

### NICE TO HAVE (If Time):
- Report submission UI (connect to Anchor program)
- Real-time transaction monitoring
- Email notifications
- Analytics dashboard

### CUT (Post-Hackathon):
- Multi-chain support
- Advanced bot detection
- Mobile app
- Extensive educational content

---

## 🚀 Key Changes from Original Plan

### ADDED (For Hackathon Success):
1. **Solana Actions (Blinks)** - Moved from "cut" to "must have"
   - Judges love social integration
   - Shows understanding of Solana ecosystem
   - Viral growth potential
   - **Time investment:** 6-8 hours (worth it!)

2. **Better Documentation**
   - Architecture diagram showing PDA design
   - Detailed README with innovation highlights
   - Code comments explaining Solana-specific patterns
   - **Time investment:** 4 hours

3. **Demo Video Focus**
   - Dedicated 2 days for video production
   - Multiple takes to perfect the pitch
   - Professional editing
   - **Time investment:** 12 hours

### KEPT (Core Value):
- Anchor program (on-chain registry)
- Detection engine (3 patterns)
- Frontend (Astro + Svelte)
- Rate limiting (Upstash Redis)

### STILL CUT:
- Email notifications (not impressive for demo)
- Advanced bot detection (too complex, high false positive rate)
- Temporal clustering (not reliable enough)
- Educational content (focus on core functionality)

---

## 📊 Judging Criteria Alignment

### Innovation (40%)
**Our Strengths:**
- ✅ First decentralized drainer registry on Solana
- ✅ PDA-based architecture (technical innovation)
- ✅ Community-powered network effects
- ✅ Solana Actions integration (ecosystem innovation)

**Pitch:** "We're not just checking wallets - we're building the first decentralized security infrastructure on Solana"

### Technical Excellence (30%)
**Our Strengths:**
- ✅ Anchor program with proper PDA design
- ✅ Transaction parsing (Solana-specific patterns)
- ✅ Rate limiting and caching (production-ready)
- ✅ Clean code with comments

**Pitch:** "Built with Anchor, demonstrates deep understanding of Solana's account model and transaction structure"

### User Experience (20%)
**Our Strengths:**
- ✅ Fast analysis (<15 seconds)
- ✅ Clear risk visualization
- ✅ Actionable recovery guidance
- ✅ Solana Actions for viral sharing

**Pitch:** "Security that's accessible to everyone - from beginners to power users"

### Impact (10%)
**Our Strengths:**
- ✅ Addresses real problem ($300M stolen)
- ✅ Open source (community benefit)
- ✅ Network effects (more reports = better protection)
- ✅ Scalable solution

**Pitch:** "Every report makes the entire Solana ecosystem safer"

---

## 💡 Demo Video Storyboard (Detailed)

### Scene 1: The Hook (0:00-0:30)
**Visuals:**
- Solscan showing real drain transaction
- News headlines about Solana drains
- Dollar amounts scrolling up ($300M+)

**Narration:**
"In 2024, wallet drainers stole over $300 million from Solana users. Current solutions are centralized, slow, and incomplete. We built something better."

### Scene 2: The Demo (0:30-1:30)
**Visuals:**
- Screen recording of actual app
- Enter wallet address
- Real-time analysis (show loading states)
- Results appear with risk meter
- Highlight detected patterns

**Narration:**
"Have I Been Drained analyzes any Solana wallet in under 15 seconds. It detects three critical attack patterns: account takeovers, unlimited approvals, and known drainer addresses. Here's what a drained wallet looks like..."

### Scene 3: The Innovation (1:30-2:30)
**Visuals:**
- Architecture diagram
- Anchor program code snippet
- On-chain report submission
- Solana Actions demo (Twitter share)

**Narration:**
"What makes this special? It's the first decentralized drainer registry on Solana. Anyone can report malicious addresses. Reports are stored on-chain using Anchor PDAs. And with Solana Actions, you can share security checks on Twitter with one click."

### Scene 4: The Impact (2:30-3:00)
**Visuals:**
- GitHub repo
- Open source license
- Community stats (reports, wallets checked)
- Call to action

**Narration:**
"This is open source. It's deployed on devnet. And it's ready to protect the Solana community. Check your wallet at haveibeendrained.org. Built in 12 days for the Solana Student Hackathon."

---

## 🛠️ Technical Architecture (For README)

```
┌─────────────────────────────────────────────────────────┐
│                   USER INTERFACE                         │
│  (Astro + Svelte + Tailwind)                            │
│  - Wallet input                                          │
│  - Real-time analysis                                    │
│  - Results visualization                                 │
│  - Solana Actions (Blinks)                              │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   HONO API SERVER                        │
│  - Rate limiting (Upstash Redis)                        │
│  - Analysis caching (PostgreSQL)                        │
│  - Helius RPC integration                               │
└────────┬───────────────────────┬────────────────────────┘
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────────────────┐
│  DETECTION       │    │  ANCHOR PROGRAM              │
│  ENGINE          │    │  (On-Chain Registry)         │
│                  │    │                              │
│  - SetAuthority  │    │  - DrainerReport PDA        │
│  - Approvals     │    │  - report_drainer()         │
│  - Known Drainer │    │  - 0.01 SOL anti-spam       │
└──────────────────┘    └──────────────────────────────┘
```

**Innovation Highlights:**
1. **PDA-Based Registry** - Deterministic account derivation for O(1) lookups
2. **Permissionless Reporting** - Anyone can contribute to community security
3. **Economic Anti-Spam** - 0.01 SOL fee prevents abuse while keeping accessible
4. **Immutable Records** - Reports can never be deleted, only incremented

---

## 📝 README Template (For Judges)

```markdown
# Have I Been Drained 🛡️

> First decentralized wallet security checker on Solana

## The Problem

In 2024, Solana wallet drainers stole $300+ million from 324,000+ users through:
- Account takeover attacks (SetAuthority)
- Unlimited token approvals
- Phishing and social engineering

Current solutions are centralized, slow, and incomplete.

## Our Solution

**Have I Been Drained** is a community-powered security platform that:
1. Analyzes any Solana wallet for drain patterns in <15 seconds
2. Stores reports on-chain in a decentralized registry
3. Enables viral sharing via Solana Actions

## Innovation

### 1. On-Chain Drainer Registry (Anchor Program)
- **Permissionless**: Anyone can report malicious addresses
- **Immutable**: Reports stored permanently on Solana
- **Economic**: 0.01 SOL anti-spam fee
- **Efficient**: PDA-based O(1) lookups

### 2. Advanced Detection Engine
- SetAuthority attacks (95% confidence)
- Unlimited approvals (85% confidence)
- Known drainer matching (100% confidence)

### 3. Solana Actions Integration
- Share security checks on Twitter/Discord
- One-click wallet analysis
- Viral community protection

## Technical Architecture

[Insert diagram here]

## Quick Start

[Installation and running instructions]

## Demo Video

[3-minute demo link]

## Built With

- Anchor v0.30.x (Solana program framework)
- Astro + Svelte (Frontend)
- Hono (API server)
- Helius RPC (Transaction data)

## License

MIT - Open source for the Solana community

## Hackathon Submission

Built for Solana Student Hackathon Fall 2025
```

---

## ✅ Final Hackathon Checklist

### Code Quality
- [ ] All code open sourced (MIT license)
- [ ] Clean, commented code
- [ ] No hardcoded secrets
- [ ] Proper error handling
- [ ] TypeScript types throughout

### Deployment
- [ ] Anchor program deployed to devnet
- [ ] Program ID documented
- [ ] Frontend deployed (Vercel/Cloudflare)
- [ ] API deployed (VPS or serverless)
- [ ] All services accessible

### Documentation
- [ ] README with problem/solution/innovation
- [ ] Architecture diagram
- [ ] Setup instructions
- [ ] Code comments explaining Solana-specific patterns
- [ ] ARCHITECTURE.md explaining PDA design

### Demo Video
- [ ] Exactly 3 minutes (not 3:01!)
- [ ] Shows problem clearly
- [ ] Demonstrates working product
- [ ] Highlights innovation
- [ ] Includes call to action
- [ ] Professional quality (clear audio, smooth editing)

### Submission
- [ ] GitHub repo public
- [ ] Demo video uploaded
- [ ] All requirements met
- [ ] Submitted to hackathon portal

---

## 🎯 Success Metrics (For Judges)

**Technical Excellence:**
- ✅ Working Anchor program on devnet
- ✅ 90%+ detection accuracy
- ✅ <15 second analysis time
- ✅ Clean, well-documented code

**Innovation:**
- ✅ First decentralized drainer registry
- ✅ PDA-based architecture
- ✅ Solana Actions integration
- ✅ Community-powered network effects

**Impact:**
- ✅ Addresses $300M+ problem
- ✅ Open source for community
- ✅ Scalable solution
- ✅ Viral growth potential

**User Experience:**
- ✅ Fast, intuitive interface
- ✅ Clear risk visualization
- ✅ Actionable recommendations
- ✅ Mobile-responsive

---

## 🚀 Day 1 Kickoff (Updated)

**Morning (4 hours):**
1. Set up GitHub repo (public, MIT license)
2. Initialize Anchor project
3. Read `research/4/production-code-template.md`
4. Implement DrainerReport account struct

**Afternoon (4 hours):**
1. Implement report_drainer instruction
2. Write basic tests
3. Deploy to localnet
4. Start README documentation

**End of Day Goal:**
- Anchor program compiles and deploys locally
- Can create DrainerReport accounts
- Tests pass
- README started with problem statement

---

**Last Updated:** December 7, 2025  
**Status:** Hackathon-optimized and ready to build  
**Next Step:** Initialize Anchor project and start Day 1
