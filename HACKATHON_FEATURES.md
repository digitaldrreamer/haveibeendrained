# Have I Been Drained? - Hackathon Features Summary

**Hackathon:** Solana Universities Fall 2025  
**Project:** First decentralized, community-powered wallet security checker on Solana  
**Status:** Built for hackathon submission

---

## 🎯 Core Innovation: On-Chain Drainer Registry

### Anchor Program Features

1. **Decentralized Drainer Registry**
   - PDA-based account structure for deterministic lookups
   - Immutable, on-chain reports stored permanently on Solana
   - Permissionless reporting (anyone can submit reports)
   - Program ID (Devnet): `BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2`

2. **Anti-Spam Protection**
   - 0.01 SOL fee per report (prevents spam while keeping it accessible)
   - Economic security model
   - Fee collection tracked on-chain

3. **Report Aggregation**
   - Multiple reports against same address increment counter
   - Tracks first reporter and timestamps
   - Stores evidence hash (SHA-256) for verification
   - Tracks total SOL reported stolen

4. **AI Metadata Support**
   - `update_ai_metadata` instruction for program authority
   - Stores attack category, methods, summary, and associated domains
   - Confidence scoring for AI-generated metadata

---

## 🔍 Advanced Detection Engine

### Multi-Pattern Detection

1. **SetAuthority Attack Detection** (CRITICAL - 95% confidence)
   - Detects unauthorized account ownership transfers
   - Identifies Token Program SetAuthority instructions
   - Flags AccountOwner authority changes
   - Provides immediate critical alerts

2. **Unlimited Approval Detection** (HIGH - 90% confidence)
   - Detects max u64 token approvals (18446744073709551615)
   - Identifies dangerous "unlimited" spending permissions
   - Flags high-risk delegate addresses
   - Recommends immediate revocation

3. **Known Drainer Detection** (CRITICAL - 100% confidence)
   - On-chain registry lookup via PDA derivation
   - Database lookup for historical drainers
   - Cross-references transaction recipients
   - Associates domains with drainer addresses

4. **Temporal Clustering Detection** (HIGH confidence)
   - Identifies rapid multi-asset drains (3+ tokens in 5 minutes)
   - Pattern-based detection (not just address-based)
   - Excludes legitimate DEX interactions
   - Flags suspicious recipient diversity

5. **Sweeper Bot Detection** (CRITICAL confidence)
   - Detects seed phrase compromise patterns
   - Identifies incoming → outgoing transfers within 10 seconds
   - Requires repetition (2+ instances) for confidence
   - Highest severity classification

### Risk Aggregation System

- **Risk Scoring:** 0-100 scale with severity levels (SAFE, AT_RISK, DRAINED)
- **Confidence Weighting:** Combines multiple factors for accuracy
- **False Positive Mitigation:** Excludes legitimate patterns (DEX trades, migrations)
- **Attack Classification:** Identifies specific attack types (seed_compromise, permit_drainer, approval_drain, etc.)

---

## 🌐 Solana Actions (Blinks) Integration

### Social Media Integration

1. **Twitter/X Integration**
   - Check wallets directly from tweets
   - One-click security analysis
   - Results displayed in-platform
   - Viral sharing mechanism

2. **Discord Integration**
   - Wallet checks from Discord messages
   - Community protection tools
   - Real-time security alerts

3. **Cross-Platform Support**
   - Works on any platform supporting Solana Actions
   - No app switching required
   - Instant results (10-15 seconds)

### Action Features

- **Check Action** (`/api/actions/check`)
  - Returns Solana Actions metadata
  - Creates memo transaction for on-chain record
  - Includes risk report in response
  - Follows Solana Actions API spec v2.4.2

- **Report Action** (`/api/actions/report`)
  - Submit drainer reports via social media
  - Direct integration with Anchor program
  - Community-powered reporting

---

## 🛡️ Real-Time Wallet Analysis

### Analysis Capabilities

1. **Transaction Analysis**
   - Fetches last 50-200 transactions via Helius RPC
   - Parses Solana-specific instructions
   - Handles Token Program and Token-2022
   - Extracts token transfers, approvals, and authority changes

2. **Asset Extraction**
   - Identifies affected tokens and NFTs
   - Calculates SOL amounts
   - Tracks asset movements
   - Provides asset-level recommendations

3. **Performance Optimization**
   - <15 second analysis time (P95)
   - Caching for frequently checked wallets
   - Parallel detection algorithms
   - Early termination for critical findings

4. **Network Support**
   - Mainnet and Devnet support
   - Configurable via environment variables
   - Network-specific RPC endpoints

---

## 📊 Public API

### RESTful API Endpoints

1. **GET /api/v1/check**
   - Unified endpoint for wallet security checks
   - Query parameters: `address`, `limit`, `experimental`
   - Rate limiting based on User-Agent tier
   - Returns comprehensive risk report

2. **GET /api/v1/analyze**
   - Full wallet analysis endpoint
   - Supports experimental features
   - Detailed detection results

3. **POST /api/report**
   - Submit drainer reports
   - Integrates with Anchor program
   - Public endpoint (no authentication required)

4. **GET /api/report/:address**
   - Query drainer reports by address
   - Returns on-chain and database data
   - Includes metadata and statistics

### Rate Limiting

- **Unregistered:** 10 requests/hour
- **Registered:** 100 requests/hour
- **Enterprise:** 1000 requests/hour
- Based on User-Agent parsing
- Caching bypasses rate limits

### OpenAPI Specification

- Complete API documentation
- `/api/openapi.json` endpoint
- Swagger-compatible format
- Auto-generated from code

---

## 🎨 Frontend Features

### User Interface

1. **Modern Web UI**
   - Built with Astro + Svelte
   - Tailwind CSS styling
   - Mobile-responsive design
   - Fast, intuitive interface

2. **Wallet Input**
   - Simple address entry
   - Real-time validation
   - Clear error messages
   - Demo mode for testing

3. **Results Visualization**
   - Risk score meter (0-100)
   - Severity indicators (SAFE, AT_RISK, DRAINED)
   - Detection timeline
   - Affected assets display
   - Actionable recommendations

4. **Recovery Guidance**
   - Attack-specific recommendations
   - Urgency levels (Critical, High, Medium)
   - External tool links (Revoke.cash, Solscan)
   - Step-by-step recovery instructions

---

## 📚 Safety Education

### Comprehensive Documentation

1. **40+ Real-World Stories**
   - Learn from actual victims' experiences
   - Story-driven security awareness
   - Categorized by threat type

2. **4 Threat Categories**
   - Hacks
   - Frauds
   - Blackmail
   - Privacy & Tracking

3. **Interlinked Articles**
   - Seamless navigation
   - Related topic suggestions
   - Comprehensive coverage

4. **Actionable Prevention**
   - Clear protection steps
   - Damage control guides
   - Best practices

---

## 🔧 Developer Features

### API Integration

1. **Widget Integration**
   - HTML widget for embedding
   - Captcha-like interface
   - Minimal configuration
   - Cross-origin support

2. **TypeScript SDK**
   - Shared package with types
   - Anchor IDL integration
   - API client utilities
   - Validation helpers

3. **Developer Documentation**
   - API reference
   - Integration guides
   - Code examples
   - Best practices

---

## 🚀 Technical Innovations

### Solana-Native Features

1. **PDA-Based Architecture**
   - Deterministic account derivation
   - O(1) lookup performance
   - Efficient on-chain storage
   - No external indexing required

2. **Transaction Parsing**
   - Deep Solana instruction analysis
   - Token Program understanding
   - Inner instruction parsing
   - Account relationship mapping

3. **On-Chain + Off-Chain Hybrid**
   - On-chain registry for immutability
   - Off-chain database for performance
   - Real-time synchronization
   - Best of both worlds

4. **Helius RPC Integration**
   - Enhanced transaction data
   - Reliable infrastructure
   - Optimized queries
   - Error handling and retries

---

## 📈 Community Features

### Community-Powered Security

1. **Permissionless Reporting**
   - Anyone can report drainers
   - No whitelist or approval needed
   - Transparent and verifiable
   - Network effects (more reports = better protection)

2. **On-Chain Transparency**
   - All reports are public
   - Verifiable on Solana Explorer
   - First reporter attribution
   - Report count tracking

3. **Open Source**
   - MIT license
   - Public GitHub repository
   - Community contributions welcome
   - Transparent development

---

## 🔐 Security Features

### Protection Mechanisms

1. **Input Validation**
   - Address format validation
   - Parameter sanitization
   - Type checking
   - Error handling

2. **Rate Limiting**
   - Prevents abuse
   - Tiered access
   - Caching optimization
   - User-Agent based

3. **CORS Configuration**
   - Secure cross-origin access
   - Environment-specific rules
   - Public API access
   - Internal API protection

4. **Error Handling**
   - Graceful degradation
   - User-friendly messages
   - Comprehensive logging
   - Error recovery

---

## 📱 Additional Features

### Wallet Alerts (Future)

- Email notifications
- Real-time monitoring
- Proactive security alerts
- Customizable thresholds

### API Key Management

- Self-service API keys
- Usage tracking
- Rate limit management
- Enterprise support

### Demo Mode

- Pre-configured test wallets
- Safe demonstration
- No real API calls
- Educational tool

---

## 🎯 Hackathon Alignment

### Submission Requirements ✅

- ✅ **Open Source** - MIT license, public GitHub repo
- ✅ **Deployed** - Anchor program on devnet
- ✅ **Innovation** - First decentralized drainer registry
- ✅ **Solana-Native** - Uses PDAs, Anchor, Solana Actions

### Judging Criteria Alignment

**Innovation (40%):**
- ✅ First decentralized drainer registry on Solana
- ✅ PDA-based architecture
- ✅ Solana Actions integration
- ✅ Community-powered network effects

**Technical Excellence (30%):**
- ✅ Anchor program with proper PDA design
- ✅ Transaction parsing (Solana-specific)
- ✅ Production-ready code
- ✅ Comprehensive error handling

**User Experience (20%):**
- ✅ Fast analysis (<15 seconds)
- ✅ Clear risk visualization
- ✅ Actionable recommendations
- ✅ Solana Actions for viral sharing

**Impact (10%):**
- ✅ Addresses $300M+ problem
- ✅ Open source for community
- ✅ Network effects
- ✅ Scalable solution

---

## 📊 Feature Summary

| Category | Feature Count | Key Features |
|----------|--------------|--------------|
| **On-Chain** | 4 | Anchor program, PDA registry, anti-spam, AI metadata |
| **Detection** | 5 | SetAuthority, Approvals, Known Drainers, Clustering, Sweeper Bots |
| **Integration** | 2 | Solana Actions (Twitter/Discord), Public API |
| **Frontend** | 4 | Modern UI, Results visualization, Recovery guidance, Mobile-responsive |
| **Education** | 4 | 40+ stories, 4 categories, Interlinked articles, Prevention guides |
| **Developer** | 3 | Widget, TypeScript SDK, Documentation |
| **Security** | 4 | Validation, Rate limiting, CORS, Error handling |

**Total Features:** 26+ core features across 7 categories

---

## 🏆 Unique Selling Points

1. **First Decentralized Registry** - On-chain, immutable, permissionless
2. **Multi-Pattern Detection** - 5 different detection algorithms
3. **Solana Actions Integration** - Viral sharing via Twitter/Discord
4. **Community-Powered** - Network effects through reporting
5. **Production-Ready** - Rate limiting, caching, error handling
6. **Comprehensive Education** - 40+ real-world security stories
7. **Developer-Friendly** - Public API, widgets, TypeScript SDK

---

**Built with ❤️ for Solana Student Hackathon Fall 2025**

