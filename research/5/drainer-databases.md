# Existing Drainer Address Databases and Threat Intelligence
## A Comprehensive Guide for "Have I Been Drained" Implementation

**Status:** December 2025 | Research for Solana Wallet Security Checker
**Last Updated:** December 7, 2025

---

## Executive Summary

Solana wallet drainers have stolen **$300+ million** from **324,000+ users** (as of 2024-2025), with recent campaigns stealing **$4.17 million monthly** from thousands of victims. Multiple threat intelligence sources exist, but **no single comprehensive open-access Solana drainer database** is currently available. Most data comes from specialized APIs (paid), community reporting, and blockchain analysis firms.

**Key Finding:** Your project can build the **first unified, open Solana drainer registry**—filling a critical gap in the security ecosystem.

---

## 1. Public Databases and APIs

### 1.1 Chainabuse.com (TRM Labs)

**Status:** ✅ **AVAILABLE & PRODUCTION-READY**

**What it is:**
- Multi-chain scam reporting platform (free community-powered + paid API)
- Powers both free platform and enterprise APIs for exchanges, banks, law enforcement
- Largest multi-chain malicious crypto activity database worldwide

**Solana Coverage:**
- ✅ Supports Solana addresses
- ✅ Tracks scams, phishing, drains, fraud
- 16+ categories of malicious activity tracked

**Access Methods:**

1. **Free Platform** (chainabuse.com)
   - Manual reporting system (victim reports)
   - Public searchable database for reported addresses
   - No API, no bulk export
   - Limitations: Depends on community reporting, potential reporting gaps

2. **Chainabuse API (v1.2)** - Paid/Enterprise
   ```
   GET /reports - Screen addresses for malicious activity
   ```
   - Query parameters: address, blockchain, category
   - Returns: risk classification, report details
   - Pricing: Custom (contact hello@chainabuse.com)
   - Features:
     - Batch address screening
     - Custom risk categories
     - Real-time updates

**Data Quality:**
- High reliability (backed by TRM Labs, used by law enforcement)
- Multi-source reporting (victims, exchanges, researchers)
- Continuously updated with new reports

**Update Frequency:** Real-time as reports submitted

**Implementation Guidance:**
```javascript
// Example: Screening addresses via API (pseudo-code)
const chainAbuseAPI = 'https://api.chainabuse.com/v1/reports';

async function checkAddress(walletAddress) {
  const response = await fetch(chainAbuseAPI, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      addresses: [walletAddress],
      blockchains: ['solana'],
      limit: 100
    })
  });
  
  const data = await response.json();
  return data.reports; // Returns matched malicious reports
}
```

**Cost Considerations:**
- Free platform: $0 (community-powered)
- API: Custom pricing (contact TRM directly)
- Alternative: Use free platform for initial MVP, upgrade to API as needed

**Challenges:**
- No bulk export of full database
- Depends on community reports (may miss some drainers)
- API pricing not public (negotiate with TRM)

---

### 1.2 Scam Sniffer

**Status:** ⚠️ **LIMITED SOLANA SUPPORT** (Primarily EVM-focused)

**What it is:**
- Real-time phishing URL detection for Web3
- Chrome extension + API for detecting malicious URLs
- Discord bot integration
- Used by NFT marketplaces and DeFi platforms

**Solana Coverage:**
- ❌ Limited Solana-specific scam database
- ✅ Detects Solana phishing URLs in real-time
- ❌ Does NOT provide wallet address reputation scoring

**Access Methods:**

1. **Chrome Extension** (Free)
   - URL warning system
   - Community-powered
   
2. **Scam Sniffer API**
   - Real-time phishing detection
   - URL-based (not address-based)
   
3. **Discord Bot** (Free)
   - Community server protection

**Data Coverage:**
- 2 major Solana phishing operations detected ($4.17M stolen from 3,947 users)
- Rainbow Drainer tracked ($2.14M from 2,189 users)
- Focuses on phishing campaigns, not all drainer types

**Implementation Note:**
Scam Sniffer is **URL-focused**, not address-focused. Better for:
- Detecting phishing links in Discord/Twitter
- NOT for wallet address screening

**Cost:** Free tier available, paid plans for businesses

---

### 1.3 Solsniffer (Solana Token Security)

**Status:** ✅ **AVAILABLE** (Token-focused, not wallet-focused)

**What it is:**
- Solana token analysis (rug pulls, honeypots, smart contract risks)
- 20+ security indicators per token
- API available for token security scoring

**Solana Coverage:**
- ✅ Comprehensive Solana coverage
- ✅ Detects fraudulent tokens
- ❌ Does NOT track wallet drainers or compromised addresses

**Access Methods:**

1. **Free Web App** (solsniffer.com)
   - 100 scans/month
   
2. **Solsniffer API**
   ```
   POST /api/token/security
   {
     "mint": "token_address",
     "details": true
   }
   ```
   - Pricing tiers: Free (100/mo), Starter ($47/mo - 5K calls), Enterprise (custom)
   - Returns: Snifscore, security features, liquidity pool, holder analysis

**What It Detects:**
- Liquidity risk
- Freeze authority misuse
- Mint authority risks
- Metadata immutability
- Top holder concentration
- Deployer analysis

**NOT Useful For:**
- Wallet drainer detection
- Address reputation
- Historical drain patterns

**Recommendation:** Use Solsniffer for token analysis **complement**, not primary drainer detection.

---

### 1.4 CertiK Skynet

**Status:** ⚠️ **GENERAL PURPOSE** (Not drainer-specific)

**What it is:**
- Multi-chain security monitoring and incident tracking
- KYC verification for projects
- Audit history and risk scoring
- Bug bounty coordination

**Solana Coverage:**
- ✅ Monitors Solana ecosystem
- ✅ Tracks exploits and security incidents
- ❌ Does NOT provide drainer address database

**Access Methods:**
- Web dashboard at skynet.certik.com
- No public API for threat intelligence
- Manual incident reporting

**What It Tracks:**
- Protocol exploits (Wormhole, Mango Markets historical data)
- Exit scams
- Private key compromises
- NOT: Wallet drainer addresses or phishing victims

**Useful Intelligence from CertiK Research:**
- Identified Solana drainer kits sold on dark web ($250-500/month as of late 2023)
- Tracked "Faint" scammer using Venom Drainer (stole 1,408.92 SOL)
- Documents common drainer attack patterns

**Recommendation:** Use CertiK **research reports** for threat landscape context, not as primary drainer database.

---

## 2. Wallet Provider Blocklists

### 2.1 Phantom Wallet

**Status:** ⚠️ **EXISTS BUT NOT PUBLIC API**

**What it is:**
- Built-in malicious address detection/blocking
- Prevents transactions to known scammer addresses
- Network-wide blocklist integration

**Solana Coverage:**
- ✅ Blocks known malicious addresses
- Users report "This account might be malicious" warnings

**Access Methods:**
- ❌ NO public API
- ❌ NO downloadable blocklist
- ❌ NO documentation on list contents

**How to Access:**
1. **Request from Phantom Directly:**
   - Contact: security@phantom.app
   - Limited access (likely enterprise-only)

2. **Reverse Engineering:**
   - Monitor Phantom network calls
   - Track blocked addresses from user community reports

**Update Frequency:** Real-time (Phantom updates continuously)

**Challenges:**
- Complete opacity on criteria and sources
- No community access
- Inconsistent blocking (varies by wallet/region?)

---

### 2.2 Solflare Wallet

**Status:** ⚠️ **BLOCKLIST EXISTS BUT UNDOCUMENTED**

**Access Methods:**
- ❌ NO public documentation
- ❌ NO API
- Blocklist exists but private

**Contact:** security@solflare.com (unlikely to share)

---

### 2.3 Backpack Wallet

**Status:** ⚠️ **MINIMAL INFORMATION**

**Access Methods:**
- ❌ NO public documentation
- ❌ NO API

**Note:** Backpack is newer; appears to focus on UX rather than security features.

---

### 2.4 Recommendation for Wallet Blocklists

**Practical Approach:**
```javascript
// Community aggregation strategy
// Since wallet providers won't share blocklists, aggregate from:

const walletBlocklistSources = [
  'phantom_twitter_warnings',      // Monitor Phantom's X/Twitter alerts
  'community_reddit_reports',      // r/solana scam warnings
  'discord_security_channels',     // Security researcher discords
  'chainabuse_api_screening',      // API screening data
  'solscan_community_flagging'     // Solscan labels
];

// Build your own aggregated blocklist
// that's actually MORE comprehensive than any single wallet provider
```

---

## 3. Blockchain Analytics Firms

### 3.1 Chainalysis

**Status:** ✅ **AVAILABLE** (Enterprise/Government focused)

**Solana Coverage:**
- ✅ Covers Solana blockchain
- ✅ Threat intelligence available
- ✅ Historical exploit tracking

**Access Methods:**
- Reactor (graphical investigation tool)
- KYT (transaction monitoring)
- Custom APIs
- ❌ NO free tier for startups

**What They Offer:**
- Illicit activity pattern detection
- Wallet clustering and attribution
- Historical incident analysis
- High-confidence identifications

**Pricing:**
- Enterprise-only (typically $50K+/year minimum)
- Contact: corporate partnerships
- Free trial: Sometimes available for qualified orgs

**Data Quality:** ⭐⭐⭐⭐⭐ (Highest)
- 10+ years of blockchain analysis
- Manual intelligence collection
- Used by law enforcement

---

### 3.2 Elliptic

**Status:** ✅ **AVAILABLE** (Enterprise/Compliance focused)

**Solana Coverage:**
- ✅ 50+ blockchains including Solana
- ✅ Cross-chain fund flow analysis
- ✅ Attribution data since 2009

**Access Methods:**
- Elliptic Lens (compliance tool)
- Custom APIs
- Data transfers (on-premises)
- ❌ NO free tier

**What They Offer:**
- Risk assessment algorithms
- Machine learning-based behavioral detection
- Cross-chain analysis
- Attribution to real-world entities
- Covers 100+ crypto assets

**Pricing:** Enterprise-only (contact sales@elliptic.co)

**Data Quality:** ⭐⭐⭐⭐⭐ (Highest)
- 50+ blockchain coverage
- Behavioral detection
- Entity linking

---

### 3.3 TRM Labs

**Status:** ✅ **AVAILABLE** (Operates Chainabuse - see section 1.1)

**Solana Coverage:**
- ✅ 25+ blockchains including Solana
- ✅ 1M+ digital assets tracked
- ✅ Real-time threat feed

**Access Methods:**
- Chainabuse API (see section 1.1 for details)
- Custom platform access
- Real-time feeds

**What They Offer:**
- 150+ risk categories
- Illicit services database
- Real-time monitoring
- Fund tracing

**Pricing:**
- Free: Chainabuse platform (community reports)
- Paid: Custom API pricing (contact hello@chainabuse.com)

**Data Quality:** ⭐⭐⭐⭐⭐ (Highest with public option)

---

### 3.4 Blockchain Intelligence Comparison

| Provider | Solana | Free Tier | API | Price | Data Quality |
|----------|--------|-----------|-----|-------|--------------|
| **Chainalysis** | ✅ | ❌ | ✅ | $50K+ | ⭐⭐⭐⭐⭐ |
| **Elliptic** | ✅ | ❌ | ✅ | Custom | ⭐⭐⭐⭐⭐ |
| **TRM Labs** | ✅ | ✅* | ✅ | Custom | ⭐⭐⭐⭐⭐ |
| **CertiK** | ✅ | ✅ | ❌ | — | ⭐⭐⭐ |
| **Solsniffer** | ✅ | ✅ | ✅ | $47+/mo | ⭐⭐⭐ |
| **Scam Sniffer** | ⚠️ | ✅ | ✅ | Custom | ⭐⭐⭐ |

*Chainabuse free platform

---

## 4. Community Sources

### 4.1 Community-Maintained Lists

**Chainalysis Report (January 2024):**
- 6,000+ member online community dedicated to Solana wallet draining
- Most documentation in Russian language
- Multiple successful drainer kits in active circulation

**Known Drainer Communities:**
- Russian-speaking hacker forums
- Dark web marketplaces
- Telegram channels (encrypted)
- Discord invite links (transient)

**Practical Access:**
- ❌ CANNOT access dark web directly
- ⚠️ Dangerous to infiltrate (law enforcement monitors)
- ✅ Use research reports from Chainalysis/Mandiant

---

### 4.2 Twitter/X Security Researchers

**Most Active Solana Security Researchers:**

1. **@scamsniffer** - Real-time phishing alerts
   - Coverage: Phishing campaigns, URL threats
   - Format: Tweet threads with details

2. **@CertiK** - Security audits & incident tracking
   - Coverage: Exploit analysis, scammer profiles
   - Format: Detailed blog posts + tweets

3. **@chainabuse** - TRM Labs official account
   - Coverage: Reported scams, victim assistance
   - Format: Tweet threads, press releases

4. **Blockchain Security Accounts:**
   - @rekteth (NFT/wallet security)
   - @0xfoobar (Solana protocol analysis)
   - @\_square (Security analysis)

**How to Track:**
```javascript
// Twitter monitoring setup
const securityAccounts = [
  '@scamsniffer',
  '@CertiK',
  '@chainabuse',
  '@rekteth'
];

// Implementation: Use Twitter API v2 to track mentions of:
// - "Solana drain", "wallet drain", "phishing", "compromised"
// - Extract wallet addresses using regex
// - Aggregate into drainer list
```

---

### 4.3 Discord Communities

**Most Active Security Discords:**

1. **Solana Foundation Security Channel**
   - Curated security announcements
   - Official incident reports
   
2. **Xandeum Community** (@xandeum.com)
   - 1,500+ members
   - Dedicated scam lookout team
   - Community-maintained drainer lists
   
3. **CertiK Discord**
   - Security research discussions
   - Incident analysis threads
   
4. **Solscan Community**
   - Address labeling discussions
   - Community-flagged addresses

**Data Access Challenges:**
- ❌ Cannot bulk export Discord messages (ToS violation)
- ✅ Manual monitoring of pinned messages
- ✅ Community consensus building for listings

---

### 4.4 Reddit Communities

**Relevant Subreddits:**

1. **r/solana** (~300K members)
   - Search: "[scam]", "[drain]", "[phishing]"
   - User-reported addresses
   - Community vetting of addresses

2. **r/Crypto_Scams**
   - Victim reports with wallet addresses
   - Attack pattern discussions

**Data Quality:** ⭐⭐⭐ (Variable, community-vetted)

**Implementation:**
```javascript
// Reddit scraping for drainer addresses
const redditAPI = 'https://www.reddit.com/r/solana/search.json';

async function scanRedditScams() {
  // Search for scam/drain posts
  const searches = ['scam', 'drain', 'phishing', 'hacked'];
  
  for (const term of searches) {
    const response = await fetch(
      `${redditAPI}?q=${term}&sort=new&limit=100`
    );
    const posts = await response.json();
    
    // Extract Solana addresses from comments/posts
    const addresses = extractAddresses(posts);
    return addresses;
  }
}

// Regex pattern for Solana addresses (44 characters, base58)
const SOLANA_ADDRESS_REGEX = /[1-9A-HJ-NP-Z]{43,44}/g;
```

**Challenges:**
- High false positive rate
- Requires manual verification
- Some addresses may be legitimate projects being brigaded

---

## 5. RPC Provider Features

### 5.1 Helius RPC

**Status:** ✅ **AVAILABLE** (No built-in reputation scoring yet)

**What It Offers:**
- Standard Solana RPC (getSignaturesForAddress, etc.)
- DAS API (Digital Asset Standard)
- Priority Fee API
- Enhanced transaction API

**Solana Coverage:**
- ✅ Full mainnet coverage
- ✅ 99.99% uptime

**Address Reputation Scoring:**
- ❌ NO built-in reputation scoring
- ❌ NO blocklist API

**What You CAN Use:**
```javascript
// Helius can help you BUILD reputation scoring
const helius = require('@helius-labs/sdk');

async function analyzeWalletActivity(address) {
  // Get all signatures for wallet
  const signatures = await connection.getSignaturesForAddress(
    new PublicKey(address)
  );
  
  // Analyze transaction patterns:
  // - Rapid transfers to multiple addresses (drain pattern)
  // - Interaction with known scam contracts
  // - Unusual transaction fees
  
  return analyzePatterns(signatures);
}
```

**Free Tier:** Generous (significant free credits)

**Recommendation:** ✅ Use Helius + custom analysis logic to BUILD your own reputation system

---

### 5.2 QuickNode

**Status:** ⚠️ **STANDARD RPC ONLY**

**What It Offers:**
- Standard Solana RPC
- Analytics APIs (paid add-on)
- NO reputation scoring

**Solana Coverage:** ✅ Full coverage

---

### 5.3 Alchemy

**Status:** ⚠️ **STANDARD RPC + SCAMSNIFFER INTEGRATION**

**What It Offers:**
- Standard RPC
- ScamSniffer integration (phishing detection)
- NO wallet drainer database

**Note:** Alchemy's Web3 dapp directory lists ScamSniffer, but it's URL-focused, not address-focused

---

### 5.4 Building Custom Reputation System

**Since no RPC provides built-in drainer scoring, build your own:**

```typescript
// Custom address reputation scoring (pseudo-code)

interface AddressReputation {
  address: string;
  riskScore: number;        // 0-100
  riskLevel: 'SAFE' | 'WARN' | 'CRITICAL';
  reasons: string[];
  sources: string[];        // Which databases flagged it
  lastUpdated: Date;
}

async function scoreAddress(address: string): Promise<AddressReputation> {
  const scores = [];
  
  // 1. Check Chainabuse
  const chainabuse = await checkChainabuse(address);
  if (chainabuse.flagged) scores.push({weight: 0.4, score: 100});
  
  // 2. Check known drainer patterns
  const patterns = await analyzeTransactionPatterns(address);
  if (patterns.isDrainer) scores.push({weight: 0.3, score: 95});
  
  // 3. Check community reports
  const reports = await checkCommunityReports(address);
  scores.push({weight: 0.2, score: reports.avgScore});
  
  // 4. Behavioral analysis
  const behavior = await analyzeBehavior(address);
  scores.push({weight: 0.1, score: behavior.suspicionScore});
  
  // Calculate weighted score
  const finalScore = scores.reduce((acc, s) => 
    acc + (s.score * s.weight), 0
  );
  
  return {
    address,
    riskScore: finalScore,
    riskLevel: finalScore > 70 ? 'CRITICAL' : 
               finalScore > 40 ? 'WARN' : 'SAFE',
    reasons: extractReasons(scores),
    sources: ['chainabuse', 'pattern-analysis', 'community'],
    lastUpdated: new Date()
  };
}
```

---

## 6. Data Collection Strategy for "Have I Been Drained"

### 6.1 Recommended Architecture

```
┌─────────────────────────────────────────────────┐
│         "Have I Been Drained" Platform          │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────── Data Layers ─────────────┐  │
│  │                                           │  │
│  │  1. PRIMARY: Chainabuse API (Paid)      │  │
│  │     - Highest reliability                │  │
│  │     - Enterprise-grade data              │  │
│  │                                           │  │
│  │  2. SECONDARY: Community Reports         │  │
│  │     - Twitter/X monitoring               │  │
│  │     - Reddit scraping                    │  │
│  │     - Discord manual tracking            │  │
│  │     - Solscan community flags            │  │
│  │                                           │  │
│  │  3. TERTIARY: Pattern Analysis           │  │
│  │     - Helius RPC signatures              │  │
│  │     - Transaction behavior               │  │
│  │     - Known drainer contract patterns    │  │
│  │                                           │  │
│  │  4. VALIDATION: Cross-reference          │  │
│  │     - Multiple source confirmation       │  │
│  │     - Community voting on addresses      │  │
│  │     - Time-based confidence increase     │  │
│  │                                           │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────── Storage ──────────────────┐  │
│  │                                           │  │
│  │  PostgreSQL:                             │  │
│  │  - drainer_addresses (main table)        │  │
│  │  - address_reports (community data)      │  │
│  │  - transaction_patterns (behavioral)     │  │
│  │  - confidence_scores (aggregated)        │  │
│  │                                           │  │
│  │  Cloudflare R2:                          │  │
│  │  - Raw data exports                      │  │
│  │  - Historical snapshots                  │  │
│  │                                           │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────── APIs ─────────────────────┐  │
│  │                                           │  │
│  │  POST /check-wallet                      │  │
│  │  GET /drainer-list                       │  │
│  │  POST /report-drainer                    │  │
│  │  GET /statistics                         │  │
│  │                                           │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### 6.2 Data Model (PostgreSQL)

```sql
-- Main drainer addresses table
CREATE TABLE drainer_addresses (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) UNIQUE NOT NULL,
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP,
  
  -- Aggregated risk scoring
  risk_score INT (0-100),
  confidence_level VARCHAR(10) CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  
  -- Source tracking
  chainabuse_flagged BOOLEAN DEFAULT FALSE,
  community_reports INT DEFAULT 0,
  behavioral_pattern_detected BOOLEAN DEFAULT FALSE,
  
  -- Attack classification
  attack_type VARCHAR(50),  -- 'PHISHING', 'ICE_PHISHING', 'MULTISIG_HACK', etc.
  
  -- Recovery info
  estimated_victims INT,
  estimated_total_stolen_usd DECIMAL(15,2),
  
  -- Audit trail
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- Community reporting system
CREATE TABLE community_reports (
  id SERIAL PRIMARY KEY,
  reporter_address VARCHAR(44),  -- Reporter's wallet (can be anonymous)
  drainer_address VARCHAR(44) NOT NULL,
  
  report_type VARCHAR(50),  -- 'VICTIM', 'OBSERVATION', 'RESEARCH'
  description TEXT,
  transaction_hash VARCHAR(88),
  amount_stolen_usd DECIMAL(15,2),
  
  -- Anti-spam
  spam_score INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  votes_up INT DEFAULT 0,
  votes_down INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (drainer_address) REFERENCES drainer_addresses(wallet_address)
);

-- Pattern detection results
CREATE TABLE transaction_patterns (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL,
  
  pattern_type VARCHAR(50),  -- 'RAPID_DRAIN', 'TOKEN_SWEEP', 'FEE_MANIPULATION'
  confidence DECIMAL(3,2),   -- 0.0-1.0
  description TEXT,
  
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (wallet_address) REFERENCES drainer_addresses(wallet_address)
);

-- Create indexes for performance
CREATE INDEX idx_wallet_address ON drainer_addresses(wallet_address);
CREATE INDEX idx_risk_score ON drainer_addresses(risk_score DESC);
CREATE INDEX idx_confidence ON drainer_addresses(confidence_level);
CREATE INDEX idx_created_at ON drainer_addresses(created_at DESC);
```

---

### 6.3 Data Collection Pipeline (Pseudocode)

```typescript
// src/tasks/drainer-detection.ts

import { CronJob } from 'cron';
import { Pool } from 'pg';
import axios from 'axios';

class DrainerDetectionPipeline {
  private db: Pool;
  private chainabuse: ChainAbuseAPI;
  private helius: HeliusRPC;
  
  constructor() {
    // Initialize connections
  }

  async runFullPipeline() {
    console.log('Starting drainer detection pipeline...');
    
    // 1. Pull new reports from Chainabuse
    await this.syncChainabuse();
    
    // 2. Scan community sources
    await this.scanTwitterMentions();
    await this.scanRedditPosts();
    await this.checkSolscanCommunityFlags();
    
    // 3. Analyze patterns on known drainers
    await this.analyzeTransactionPatterns();
    
    // 4. Recalculate risk scores
    await this.recalculateRiskScores();
    
    // 5. Export updated list
    await this.exportDrainerList();
    
    console.log('Pipeline complete');
  }

  // 1. CHAINABUSE SYNC
  private async syncChainabuse() {
    const reports = await this.chainabuse.getReports({
      blockchain: 'solana',
      category: ['scam', 'phishing', 'drain'],
      limit: 10000
    });

    for (const report of reports) {
      // Upsert to database
      await this.db.query(`
        INSERT INTO drainer_addresses 
        (wallet_address, chainabuse_flagged, attack_type)
        VALUES ($1, $2, $3)
        ON CONFLICT (wallet_address) DO UPDATE SET
        chainabuse_flagged = true,
        updated_at = NOW()
      `, [report.address, true, report.category]);
    }
  }

  // 2. TWITTER MONITORING
  private async scanTwitterMentions() {
    const query = '(Solana OR sol) (drain OR drainer OR phishing OR scam) -is:retweet';
    
    const tweets = await this.twitter.search({
      query,
      max_results: 100,
      tweet_fields: ['created_at', 'author_id'],
      expansions: ['author_id'],
      user_fields: ['username']
    });

    for (const tweet of tweets.data || []) {
      const addresses = this.extractSolanaAddresses(tweet.text);
      
      for (const address of addresses) {
        // Insert community report
        await this.db.query(`
          INSERT INTO community_reports 
          (drainer_address, reporter_address, report_type, description)
          VALUES ($1, $2, 'OBSERVATION', $3)
        `, [address, ANON_ADDRESS, tweet.text]);
      }
    }
  }

  // 3. REDDIT SCRAPING
  private async scanRedditPosts() {
    const subreddits = ['solana', 'Crypto_Scams'];
    
    for (const subreddit of subreddits) {
      const posts = await this.reddit.getNew({
        subreddit,
        limit: 100
      });

      for (const post of posts) {
        const addresses = this.extractSolanaAddresses(
          post.title + ' ' + post.selftext
        );
        
        for (const address of addresses) {
          // Add community report
          await this.db.query(`
            INSERT INTO community_reports 
            (drainer_address, report_type, description)
            VALUES ($1, 'OBSERVATION', $2)
          `, [address, post.url]);
        }
      }
    }
  }

  // 4. PATTERN ANALYSIS
  private async analyzeTransactionPatterns() {
    // Get recently updated addresses
    const addresses = await this.db.query(`
      SELECT wallet_address FROM drainer_addresses
      WHERE updated_at > NOW() - INTERVAL '7 days'
      LIMIT 1000
    `);

    for (const {wallet_address} of addresses.rows) {
      const patterns = await this.detectDrainPatterns(wallet_address);
      
      for (const pattern of patterns) {
        await this.db.query(`
          INSERT INTO transaction_patterns 
          (wallet_address, pattern_type, confidence, description)
          VALUES ($1, $2, $3, $4)
        `, [wallet_address, pattern.type, pattern.confidence, pattern.description]);
      }
    }
  }

  // 5. RISK SCORE CALCULATION
  private async recalculateRiskScores() {
    const addresses = await this.db.query(`
      SELECT id, wallet_address FROM drainer_addresses
      LIMIT 10000
    `);

    for (const {id, wallet_address} of addresses.rows) {
      const score = await this.calculateRiskScore(wallet_address);
      
      await this.db.query(`
        UPDATE drainer_addresses 
        SET risk_score = $1, confidence_level = $2, updated_at = NOW()
        WHERE wallet_address = $3
      `, [score.value, score.level, wallet_address]);
    }
  }

  private async calculateRiskScore(address: string): Promise<{value: number; level: string}> {
    // Multi-factor risk calculation
    let score = 0;
    let reasons: string[] = [];

    // 1. Chainabuse flag (40% weight)
    const chainabuse = await this.db.query(
      'SELECT chainabuse_flagged FROM drainer_addresses WHERE wallet_address = $1',
      [address]
    );
    if (chainabuse.rows[0]?.chainabuse_flagged) {
      score += 40;
      reasons.push('Flagged by Chainabuse');
    }

    // 2. Community reports (25% weight)
    const reports = await this.db.query(
      'SELECT COUNT(*), AVG(votes_up - votes_down) as net_votes FROM community_reports WHERE drainer_address = $1',
      [address]
    );
    const reportCount = parseInt(reports.rows[0].count || 0);
    if (reportCount > 0) {
      score += Math.min(25, reportCount * 2);
      reasons.push(`${reportCount} community reports`);
    }

    // 3. Transaction patterns (20% weight)
    const patterns = await this.db.query(
      'SELECT AVG(confidence) as avg_confidence FROM transaction_patterns WHERE wallet_address = $1',
      [address]
    );
    const patternConfidence = parseFloat(patterns.rows[0]?.avg_confidence || 0);
    if (patternConfidence > 0.5) {
      score += patternConfidence * 20;
      reasons.push('Suspicious transaction patterns detected');
    }

    // 4. Time-decay (reduce false positives from old reports)
    const recency = await this.db.query(
      'SELECT EXTRACT(EPOCH FROM (NOW() - MAX(updated_at)))/86400 as days_ago FROM drainer_addresses WHERE wallet_address = $1',
      [address]
    );
    const daysAgo = parseFloat(recency.rows[0]?.days_ago || 0);
    if (daysAgo > 365) {
      score *= 0.7;  // 30% reduction for old reports
      reasons.push('Report is over 1 year old');
    }

    // Determine confidence level
    let level = 'LOW';
    if (score >= 80) level = 'CRITICAL';
    else if (score >= 60) level = 'HIGH';
    else if (score >= 40) level = 'MEDIUM';

    return {value: Math.min(100, score), level};
  }

  // 6. EXPORT LIST
  private async exportDrainerList() {
    const addresses = await this.db.query(`
      SELECT 
        wallet_address,
        risk_score,
        confidence_level,
        attack_type,
        first_seen,
        estimated_victims,
        estimated_total_stolen_usd
      FROM drainer_addresses
      WHERE confidence_level != 'LOW'
      ORDER BY risk_score DESC
    `);

    // Format for various uses
    const json = JSON.stringify(addresses.rows);
    const csv = this.convertToCSV(addresses.rows);
    
    // Upload to R2
    await this.uploadToR2('drainer-list.json', json);
    await this.uploadToR2('drainer-list.csv', csv);
    
    // Update API response cache
    await this.updateAPICache(addresses.rows);
  }

  // HELPER: Extract Solana addresses from text
  private extractSolanaAddresses(text: string): string[] {
    // Solana addresses: base58, 43-44 characters, start with valid base58 chars
    const regex = /[1-9A-HJ-NP-Z]{43,44}/g;
    const matches = text.match(regex) || [];
    
    // Validate: must be valid public key
    return matches.filter(addr => {
      try {
        new PublicKey(addr);
        return true;
      } catch {
        return false;
      }
    });
  }

  private async detectDrainPatterns(address: string) {
    // Get signature history
    const signatures = await this.helius.getSignaturesForAddress(address);
    
    // Analyze for drain patterns:
    // 1. Rapid multiple transfers in short time
    // 2. Transfers to many different addresses
    // 3. Unusual fee patterns
    // 4. Interaction with known drainer contracts
    
    const patterns = [];
    
    // Pattern 1: RAPID_DRAIN
    const rapidTransfers = this.detectRapidTransfers(signatures);
    if (rapidTransfers) {
      patterns.push({
        type: 'RAPID_DRAIN',
        confidence: 0.8,
        description: 'Multiple transfers detected in rapid succession'
      });
    }
    
    // Pattern 2: TOKEN_SWEEP
    const tokenSweep = this.detectTokenSweep(signatures);
    if (tokenSweep) {
      patterns.push({
        type: 'TOKEN_SWEEP',
        confidence: 0.75,
        description: 'Multiple token transfers to same address'
      });
    }
    
    // Add more pattern detection as needed...
    
    return patterns;
  }

  private detectRapidTransfers(signatures: any[]): boolean {
    // Implementation: check if >10 transfers in <5 minutes
    return false;  // TODO
  }

  private detectTokenSweep(signatures: any[]): boolean {
    // Implementation: check if same destination address for many tokens
    return false;  // TODO
  }
}

// Run pipeline every hour
const pipeline = new DrainerDetectionPipeline();
new CronJob('0 * * * *', () => pipeline.runFullPipeline()).start();
```

---

## 7. Estimated Drainer Database Size

### Current Data Points (As of December 2025):

| Metric | Count |
|--------|-------|
| Known Solana drainer wallets (industry research) | 50-200+ |
| Unique victims (reported) | 324,000+ |
| Total losses tracked | $300M+ |
| Monthly new losses | $4-10M |
| Active drainer communities | 6,000+ members |
| Active drainer kits in circulation | 5-10+ variants |

### Expected Coverage by Source:

- **Chainabuse:** 100-500 addresses (growing)
- **Community Reports:** 200-1000 addresses (unverified)
- **Pattern Analysis:** 50-300 addresses (behavioral match)
- **Blockchain Intelligence Firms:** 50-200 addresses (enterprise databases)

**Total Addressable Database:** 300-2000+ unique Solana drainer addresses

**Your Competitive Advantage:** By aggregating all sources, you can build the most comprehensive public Solana drainer database (first-mover advantage).

---

## 8. Implementation Recommendations

### Phase 1: MVP (Weeks 1-2)

```
✅ Integrate Chainabuse API
✅ Add manual community reporting
✅ Build basic risk scoring
✅ Deploy `/check-wallet` endpoint
```

### Phase 2: Expansion (Weeks 2-3)

```
✅ Twitter/X monitoring automation
✅ Reddit scraping pipeline
✅ Behavioral pattern detection
✅ Community voting system
✅ Anti-spam mechanisms
```

### Phase 3: Production (Week 3-4)

```
✅ Solana Blinks integration for sharing
✅ Educational content system
✅ Recovery guidance database
✅ Real-time database exports
```

---

## 9. Cost Estimation

### Free Resources

| Service | Cost | Notes |
|---------|------|-------|
| Chainabuse API | $0 platform + custom API | Free platform works for MVP |
| Twitter API v2 | $0 | Standard tier for small usage |
| Reddit API | $0 | Rate limited but free |
| Helius RPC | $0 | Generous free tier |
| PostgreSQL | $0-50 | Self-hosted or managed |
| Cloudflare R2 | $5 | Storage + egress |
| **Total** | **~$5-50/month** | **Very sustainable** |

### Paid Upgrades (If Needed)

| Service | Cost | When Needed |
|---------|------|------------|
| Chainabuse API | Custom | >10K requests/month |
| Chainalysis | $50K+/year | Enterprise integration |
| Twitter API Pro | $500/month | High-volume monitoring |
| Dedicated Database | $100+/month | >1M records |

**Recommendation:** Start free/cheap, upgrade only as needed (scale = revenue opportunity).

---

## 10. Key Challenges & Solutions

### Challenge 1: False Positives
**Problem:** Community reports may flag legitimate addresses

**Solution:**
```sql
-- Multi-confirmation requirement
CREATE TABLE address_confirmation (
  address VARCHAR(44),
  confirmation_sources INT,
  confidence_level VARCHAR(10),
  
  -- Require 3+ sources for HIGH confidence
  CONSTRAINT high_confidence_requires_3_sources 
    CHECK (confidence_level != 'HIGH' OR confirmation_sources >= 3)
);
```

### Challenge 2: Community Spam
**Problem:** Malicious users report fake drainers to harm projects

**Solution:**
- Spam scoring system (downvotes vs upvotes)
- IP rate limiting on report submissions
- Reputation system for reporters
- Manual review of < LOW confidence reports

### Challenge 3: Data Freshness
**Problem:** Addresses go dormant, creating zombie entries

**Solution:**
```typescript
// Age-based confidence decay
function applyTimeDecay(reportAge: number, baseConfidence: number): number {
  // Each month old = 5% confidence reduction
  const monthsOld = reportAge / (30 * 24 * 60 * 60 * 1000);
  return baseConfidence * Math.pow(0.95, monthsOld);
}
```

### Challenge 4: Cross-Chain Drainers
**Problem:** Some drainers operate on multiple chains

**Solution:**
- Track cross-chain patterns
- Link EVM drainer addresses to Solana counterparts
- Include in risk assessment

---

## 11. Recommended Implementation Stack for Your Project

```typescript
// Backend (Hono API - you're already using)
// ✅ Perfect for serverless drainer-checking endpoints

// Database (PostgreSQL)
// ✅ Perfect for relational reporting structure
// ✅ Built-in full-text search for community reports

// Data Pipeline (Node.js + Cron)
// ✅ Helius RPC for signature analysis
// ✅ Chainabuse API for threat intel
// ✅ Twitter API v2 for monitoring

// Frontend (Astro + Svelte)
// ✅ Build dashboard for drainer reports
// ✅ Display risk scores with confidence levels
// ✅ Community reporting interface

// Storage (Cloudflare R2)
// ✅ Export snapshots daily
// ✅ Historical data archive
// ✅ Backup for compliance

// API for external use
// POST /api/check-wallet/{address}
// GET /api/drainers/list
// POST /api/drainers/report
// GET /api/statistics
```

---

## 12. Conclusion: Your Unique Value Proposition

**Market Gap You're Filling:**

1. ❌ **No unified Solana drainer database exists** (unlike Chainanalysis/Elliptic - enterprise-only)
2. ❌ **Wallet providers keep blocklists private** (Phantom, Solflare, Backpack)
3. ❌ **No accessible threat intel for retail users** (TRM/Chainalysis = $50K+ minimum)
4. ❌ **Community data is scattered** (Twitter, Reddit, Discord - hard to aggregate)

**Your Project = "Chainabuse for Solana drainers" but OPEN & FREE**

---

## References & Further Reading

- Chainabuse: https://chainabuse.com/
- Chainalysis 2022 Solana Exploits Report
- Mandiant CLINKSINK Campaign Analysis (Google Cloud Blog)
- Scam Sniffer Solana Phishing Report (Binance Square)
- CertiK Faint Scammer Case Study
- TRM Labs Blockchain Intelligence Platform

---

**Last Updated:** December 7, 2025  
**Status:** Ready for implementation  
**Deadline:** December 19, 2025 (12 days remaining)
