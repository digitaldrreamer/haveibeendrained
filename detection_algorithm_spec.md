# Detection Algorithm Specification

## Overview

This document specifies the detection algorithms used to identify wallet drains on Solana. The algorithms are designed to balance detection accuracy with performance, operating on transaction history data fetched from Helius RPC.

---

## 1. Algorithm Architecture

### 1.1 Detection Pipeline

**Sequential Processing Model:**
```
Input: Wallet Address
  ↓
Stage 1: Transaction Fetching
  ↓
Stage 2: Transaction Parsing
  ↓
Stage 3: Pattern Detection (Parallel)
  ├─ Temporal Clustering
  ├─ Sweeper Bot Detection
  ├─ Known Drainer Lookup
  └─ On-Chain Registry Query
  ↓
Stage 4: Risk Aggregation
  ↓
Stage 5: Attack Classification
  ↓
Stage 6: Recovery Guidance Generation
  ↓
Output: DrainAnalysis Object
```

**Processing Characteristics:**
- Stages 1-2 are sequential (data dependency)
- Stage 3 detections run in parallel (independent)
- Stages 4-6 are sequential (require aggregated data)
- Total execution time target: <15s P95

### 1.2 Data Structures

**Transaction Object:**
- Signature (unique identifier)
- Timestamp (block time)
- Type (incoming vs outgoing transfer)
- Token mint address (SPL token or native SOL)
- Amount (in token's smallest unit)
- Sender address
- Recipient address
- Program invoked (Token Program, Token-2022, etc.)
- Instruction type (Transfer, Approve, SetAuthority, etc.)

**RiskFactor Object:**
- Type (string enum: temporal_clustering, sweeper_bot, known_drainer, etc.)
- Severity (enum: LOW, MEDIUM, HIGH, CRITICAL)
- Evidence (transaction signatures, addresses, timestamps)
- Confidence score (0.0 to 1.0)
- Description (human-readable explanation)

**DrainAnalysis Object:**
- Overall risk (enum: SAFE, AT_RISK, DRAINED)
- Risk factors (array of RiskFactor objects)
- Attack type (if drained: permit_drainer, seed_compromise, etc.)
- Drained assets (array of token amounts and values)
- Recommendations (array of conditional guidance strings)
- Checked timestamp (ISO 8601)

---

## 2. Stage 1: Transaction Fetching

### 2.1 RPC Query Strategy

**Initial Fetch:**
- Method: `getSignaturesForAddress`
- Limit: 1000 signatures (maximum per call)
- Options: `{ commitment: 'confirmed' }`
- Result: Array of signature objects with block time

**Pagination Logic:**
- If result count = 1000, wallet likely has more transactions
- For MVP: Analyze first 1000 only (most recent)
- For post-MVP: Implement pagination with `before` parameter

**Performance Optimization:**
- Cache signature list for 5 minutes (transactions rarely change retroactively)
- Parallel fetch if pagination required
- Abort if wallet has >10,000 transactions (too large for real-time analysis)

### 2.2 Error Handling

**RPC Failures:**
- Timeout after 30 seconds
- Retry once with exponential backoff
- Fall back to cached result if available
- Return partial analysis if some data fetched

**Invalid Address:**
- Validate base58 encoding before RPC call
- Return user-friendly error immediately
- Don't waste RPC calls on invalid input

**Rate Limiting:**
- Implement exponential backoff on 429 errors
- Track request count to avoid hitting limits
- Consider queueing requests during high load

---

## 3. Stage 2: Transaction Parsing

### 3.1 Detailed Transaction Fetching

**Batch Fetch:**
- Method: `getParsedTransactions`
- Input: Array of signatures from Stage 1
- Options: `{ maxSupportedTransactionVersion: 0, commitment: 'confirmed' }`
- Batch size: 100 signatures per request (stay within RPC limits)

**Parsing Requirements:**
- Extract all token transfers (both SPL and native SOL)
- Identify transfer direction relative to target wallet
- Parse token metadata (mint, decimals, amount)
- Extract program interactions (approvals, delegates)
- Calculate USD value if possible (price oracle or coingecko)

### 3.2 Transfer Extraction Logic

**Token Transfer Identification:**
- Look in `transaction.meta.preTokenBalances` and `postTokenBalances`
- Calculate difference to determine transfer amount
- Match to target wallet address to determine direction
- Handle edge cases: self-transfers, multi-leg swaps

**Native SOL Transfer Identification:**
- Parse `transaction.meta.preBalances` and `postBalances`
- Account for transaction fees (don't flag fee as transfer)
- Identify transfers vs balance changes from rent/rewards

**Program Instruction Analysis:**
- Parse `transaction.transaction.message.instructions`
- Identify Token Program calls (Transfer, Approve, SetAuthority)
- Extract instruction data (approval amounts, delegate addresses)
- Handle inner instructions (nested program calls)

### 3.3 Data Normalization

**Amount Conversion:**
- Convert all amounts to decimal using token decimals
- Store both raw amount and decimal amount
- Calculate USD value if price data available

**Timestamp Normalization:**
- Convert block time to Unix timestamp (seconds)
- Handle null block times (unconfirmed transactions)
- Sort transactions by timestamp ascending

**Address Normalization:**
- Store all addresses as base58 strings
- Lowercase for case-insensitive comparison
- Validate all addresses before storage

---

## 4. Stage 3: Pattern Detection

### 4.1 Temporal Clustering Detection

**Purpose:** Identify rapid multi-asset drains characteristic of phishing attacks

**Algorithm:**

1. **Time Window Selection:**
   - Default window: 5 minutes (300 seconds)
   - Configurable via environment variable
   - Rationale: Legitimate users rarely move multiple assets within minutes

2. **Asset Counting:**
   - Group outgoing transfers by time window
   - Count unique token mints transferred
   - Threshold: 3+ different assets in single window

3. **Confidence Scoring:**
   - 3 assets = 0.7 confidence (moderate)
   - 5+ assets = 0.9 confidence (high)
   - 10+ assets = 1.0 confidence (certain)

4. **False Positive Reduction:**
   - Exclude known DEX program interactions (Raydium, Orca, Jupiter)
   - Exclude wallet migration patterns (all assets to single recipient)
   - Require at least 2 different recipients (prevent flagging consolidation)

**Output:**
- RiskFactor with type: `temporal_clustering`
- Severity: HIGH (if threshold met)
- Evidence: Array of transaction signatures in window
- Confidence: Calculated score

**Thresholds (Configurable):**
- Time window: 300 seconds (5 minutes)
- Asset count: 3 unique tokens
- Recipient diversity: 2 different addresses

### 4.2 Sweeper Bot Detection

**Purpose:** Identify compromised seed phrases where incoming funds are immediately swept

**Algorithm:**

1. **Pattern Recognition:**
   - Find incoming transfer transaction
   - Check for outgoing transfer within 10 seconds
   - Verify outgoing amount ≈ incoming amount (minus fees)
   - Confirm pattern repeats (at least 2 instances)

2. **Timing Analysis:**
   - Measure time delta between incoming and outgoing
   - Threshold: <10 seconds for high confidence
   - Threshold: <30 seconds for medium confidence
   - Rationale: Legitimate users don't move funds that quickly

3. **Amount Correlation:**
   - Calculate ratio: outgoing_amount / incoming_amount
   - Expect ratio near 1.0 (full sweep minus fees)
   - Acceptable range: 0.95 to 1.0
   - Account for transaction fees (~0.000005 SOL)

4. **Repetition Check:**
   - Single instance could be coincidence
   - Require at least 2 sweep events
   - Higher confidence with more repetitions

**Output:**
- RiskFactor with type: `sweeper_bot`
- Severity: CRITICAL (indicates seed compromise)
- Evidence: Array of sweep event pairs (incoming tx, outgoing tx)
- Confidence: Based on repetition count and timing

**Thresholds (Configurable):**
- Max time delta: 10 seconds (high), 30 seconds (medium)
- Min amount ratio: 0.95
- Min repetitions: 2 events

### 4.3 Known Drainer Database Lookup

**Purpose:** Check if transaction recipients are known malicious addresses

**Algorithm:**

1. **Recipient Extraction:**
   - Collect all unique recipient addresses from outgoing transfers
   - Deduplicate to minimize database queries
   - Exclude self-transfers (same wallet)

2. **Database Query:**
   - Single query with `WHERE address IN (...)` clause
   - Return all matching drainer records
   - Include metadata: report count, source, first reported date

3. **Match Evaluation:**
   - Any match = positive detection
   - Higher report count = higher confidence
   - Recent reports = higher confidence

4. **Confidence Scoring:**
   - Report count 1-5 = 0.6 confidence
   - Report count 6-20 = 0.8 confidence
   - Report count 21+ = 1.0 confidence
   - Adjust based on recency (reports in last 30 days weighted 1.5x)

**Output:**
- RiskFactor with type: `known_drainer`
- Severity: CRITICAL (confirmed malicious address)
- Evidence: Drainer address, report count, source
- Confidence: Calculated based on report count and recency

**Optimization:**
- Cache database results for 1 hour
- Pre-load top 1000 drainers into memory
- Consider Redis for high-frequency lookups

### 4.4 On-Chain Registry Query

**Purpose:** Check Solana program for community-reported drainers

**Algorithm:**

1. **PDA Derivation:**
   - For each recipient address, derive PDA: `["drainer", recipient_pubkey]`
   - Use deterministic derivation (findProgramAddressSync)
   - Cache derived PDAs to avoid redundant computation

2. **Account Fetch:**
   - Batch fetch all PDAs in single RPC call
   - Use `getMultipleAccounts` for efficiency
   - Handle non-existent accounts (no reports yet)

3. **Data Deserialization:**
   - Parse DrainerReport account structure
   - Extract report_count, first_reporter, timestamps
   - Validate data integrity (report_count > 0, valid timestamps)

4. **Confidence Scoring:**
   - On-chain reports generally more trustworthy (paid fee)
   - Report count 1-2 = 0.7 confidence
   - Report count 3-10 = 0.9 confidence
   - Report count 11+ = 1.0 confidence

**Output:**
- RiskFactor with type: `onchain_reported`
- Severity: HIGH (community consensus)
- Evidence: On-chain report data (count, first reporter, timestamp)
- Confidence: Based on report count

**Optimization:**
- Cache on-chain data for 10 minutes (less volatile than database)
- Parallel fetch with database query
- Fall back gracefully if RPC fails (don't block analysis)

---

## 5. Stage 4: Risk Aggregation

### 5.1 Severity Hierarchy

**Severity Levels:**
- **CRITICAL:** Definitive evidence of compromise (sweeper bot, known drainer)
- **HIGH:** Strong evidence of drain (temporal clustering, on-chain reports)
- **MEDIUM:** Suspicious activity but not conclusive
- **LOW:** Minor red flags

**Overall Risk Calculation:**
- If any CRITICAL factor → Overall risk = DRAINED
- If any HIGH factor → Overall risk = AT_RISK
- If only MEDIUM/LOW → Overall risk = AT_RISK (with lower confidence)
- If no factors → Overall risk = SAFE

### 5.2 Confidence Weighting

**Combining Multiple Factors:**
- Multiple HIGH factors increase confidence
- HIGH + CRITICAL = very high confidence DRAINED
- Single HIGH factor = moderate confidence AT_RISK

**Confidence Adjustment Rules:**
- Known drainer + temporal clustering = boost confidence by 0.1
- On-chain reports + database match = boost confidence by 0.15
- Single factor in isolation = use factor's base confidence

**Final Confidence Score:**
- Range: 0.0 to 1.0
- Used to determine recommendation strength
- Displayed to user as certainty indicator

### 5.3 False Positive Mitigation

**Legitimate Activity Patterns:**
- DEX trades involve multiple tokens but have distinctive signatures
- Wallet migrations move all assets but to single, user-controlled address
- Airdrops cause incoming transfers without corresponding outgoing

**Exclusion Rules:**
- Exclude transactions involving known legitimate programs (Jupiter, Raydium)
- Exclude patterns where user retains control (approvals to self)
- Require minimum time window between unrelated multi-asset moves

**User Context:**
- Display evidence with each risk factor
- Allow users to understand why flagged
- Provide transaction links for verification

---

## 6. Stage 5: Attack Classification

### 6.1 Classification Logic

**Decision Tree:**

1. **If sweeper bot detected:**
   - Classification: `seed_compromise`
   - Rationale: Only possible if attacker has seed phrase
   - Confidence: Sweeper bot confidence score

2. **If known drainer + temporal clustering:**
   - Classification: `permit_drainer` or `approval_drain`
   - Examine transaction instructions to distinguish
   - Look for Permit signatures or Approve instructions

3. **If only temporal clustering:**
   - Classification: `unknown_drain`
   - Could be various attack vectors
   - Recommend general security review

4. **If only known drainer (no clustering):**
   - Classification: `single_transaction_drain`
   - User likely signed single malicious transaction
   - Examine specific transaction type

**Attack Types:**
- `seed_compromise`: Attacker has seed phrase (sweeper bot)
- `permit_drainer`: Phishing attack using Permit signature
- `approval_drain`: Unlimited approval granted to malicious address
- `malicious_extension`: Browser extension intercepted transactions
- `single_transaction_drain`: One-off malicious transaction
- `unknown_drain`: Suspicious activity but unclear mechanism

### 6.2 Evidence Collection

**For Each Classification:**
- Identify key transactions demonstrating attack
- Extract relevant instruction data (approval amounts, signatures)
- Collect drainer addresses involved
- Calculate total value lost

**Drained Asset Calculation:**
- Sum all outgoing transfers to drainer addresses
- Convert to USD using price data (if available)
- Group by token type
- Calculate percentage of total wallet value lost

### 6.3 Classification Confidence

**High Confidence (0.9+):**
- Sweeper bot with 3+ repetitions
- Known drainer + temporal clustering + approval instruction

**Medium Confidence (0.7-0.9):**
- Temporal clustering + on-chain reports
- Single sweeper event

**Low Confidence (0.5-0.7):**
- Only on-chain reports (no other factors)
- Temporal clustering without known drainer

**Report to User:**
- Always show confidence level
- Explain basis for classification
- Provide links to supporting transactions

---

## 7. Stage 6: Recovery Guidance Generation

### 7.1 Conditional Recommendations

**Based on Attack Type:**

**If `seed_compromise`:**
1. ABANDON WALLET IMMEDIATELY (highest priority)
2. Never use this seed phrase again
3. Create entirely new wallet with new seed
4. Report to law enforcement if loss > $5,000
5. Consider this wallet permanently compromised

**If `permit_drainer` or `approval_drain`:**
1. Revoke all token approvals immediately (link to Revoke.cash)
2. Move remaining assets to new wallet
3. Your seed phrase is likely still safe
4. Review recent transactions for other approvals
5. Enable transaction simulation in wallet

**If `malicious_extension`:**
1. Remove all suspicious browser extensions
2. Scan computer for malware
3. Move remaining assets to new wallet (created in clean browser)
4. Consider using hardware wallet
5. Review browser extension permissions

**If `unknown_drain`:**
1. Move remaining assets to new wallet (precautionary)
2. Revoke all approvals (defensive measure)
3. Review recent transactions manually
4. Consider consulting security expert
5. Report incident to wallet provider

### 7.2 Urgency Levels

**Critical (Act Now):**
- Seed compromise (sweeper bot active)
- Assets currently being drained
- Malicious approvals still active

**High (Act Today):**
- Drain completed, but approvals remain
- Malicious extension still installed
- Remaining assets at risk

**Medium (Act This Week):**
- Historical drain, no ongoing risk
- Educational review recommended
- Preventive measures advised

**Priority Ordering:**
- Show most urgent actions first
- Use visual indicators (red = critical, yellow = high)
- Provide estimated time for each action

### 7.3 Resource Links

**External Tools:**
- Revoke.cash: Token approval revocation
- Solscan: Transaction explorer for evidence review
- Wallet provider support: Report incident
- Law enforcement: If loss exceeds $5,000

**Educational Resources:**
- Link to /learn pages for attack type
- Video tutorials for revocation process
- Security best practices guide
- How to set up hardware wallet

**Support Channels:**
- Community Discord for questions
- Email support for complex cases
- Social media for updates on active threats

---

## 8. Algorithm Performance

### 8.1 Computational Complexity

**Stage 1 (Fetching):**
- Time: O(n) where n = number of RPC calls
- Network bound, not CPU bound
- Target: <5s for 1000 transactions

**Stage 2 (Parsing):**
- Time: O(n) where n = number of transactions
- CPU bound, linear parsing
- Target: <2s for 1000 transactions

**Stage 3 (Detection):**
- Temporal Clustering: O(n) single pass
- Sweeper Bot: O(n) pattern matching
- Database Lookup: O(1) with indexing
- On-chain Query: O(m) where m = unique recipients
- Target: <5s total (parallelized)

**Stages 4-6 (Aggregation):**
- Time: O(k) where k = number of risk factors
- Negligible (<1s typically)

**Total Target: <15s P95**

### 8.2 Scalability Considerations

**Memory Usage:**
- Transaction objects: ~1KB each
- 1000 transactions = ~1MB memory
- Parsed data: ~2MB total per analysis
- Acceptable for serverless environments

**Database Load:**
- Reads only during analysis (no writes)
- Indexed queries (O(1) lookups)
- Consider read replicas for scale
- Cache frequently accessed drainers

**RPC Load:**
- Most expensive operation
- Rate limiting is main constraint
- Implement aggressive caching
- Consider RPC provider upgrade if needed

### 8.3 Optimization Opportunities

**Caching Strategy:**
- Cache transaction signatures for 5 minutes
- Cache parsed transactions for 1 hour
- Cache drainer lookups for 24 hours
- Cache analysis results for 1 hour

**Parallel Processing:**
- Fetch and parse can overlap
- Multiple detection algorithms in parallel
- Database and on-chain queries in parallel

**Early Termination:**
- If CRITICAL factor found early, can skip remaining checks
- If wallet has zero transactions, skip immediately
- If wallet never had outgoing transfers, return SAFE quickly

---

## 9. Testing & Validation

### 9.1 Test Cases

**Known Safe Wallets:**
- Empty wallet (never used)
- HODLer wallet (only incoming, no outgoing)
- Active trader (many DEX transactions)
- Wallet migrator (moved all assets to new wallet once)

**Known Drained Wallets:**
- Permit drainer victim (temporal clustering + known drainer)
- Seed compromise victim (sweeper bot pattern)
- Approval drain victim (unlimited approval granted)
- Mixed attack victim (multiple attack vectors)

**Edge Cases:**
- Wallet with 10,000+ transactions (performance test)
- Wallet with no price data (handle gracefully)
- Wallet with failed transactions (ignore)
- Wallet with self-transfers (don't flag)

### 9.2 Accuracy Metrics

**Target Metrics:**
- True Positive Rate: >90% (correctly identify drains)
- False Positive Rate: <5% (incorrectly flag safe wallets)
- True Negative Rate: >95% (correctly identify safe)
- False Negative Rate: <10% (miss actual drains)

**Measurement:**
- Curated test set of 100+ wallets
- Manual verification of each wallet's status
- Regular re-testing as algorithms evolve

### 9.3 Continuous Improvement

**Feedback Loop:**
- Collect user reports of false positives/negatives
- Analyze misclassified wallets
- Adjust thresholds based on data
- Add new detection patterns as attacks evolve

**A/B Testing:**
- Test threshold changes on subset of traffic
- Measure impact on accuracy metrics
- Roll out improvements gradually

---

## 10. Algorithm Limitations

### 10.1 Known Blind Spots

**Cannot Detect:**
- Social engineering (user willingly sends funds)
- Compromises of off-chain systems (exchange accounts)
- Future drains (only detects past activity)
- Sophisticated obfuscation (tumbler services)

**Limited Detection:**
- New, unreported drainer addresses (no database match)
- One-time small drains (below thresholds)
- Legitimate rapid transfers (may false positive)

### 10.2 Mitigation Strategies

**For New Drainers:**
- Rely on temporal clustering (pattern-based, not address-based)
- Encourage community reporting to build database
- Lower confidence but still flag suspicious activity

**For Small Drains:**
- Adjust thresholds based on user feedback
- Consider wallet balance context (10 SOL drain from 1000 SOL wallet vs 10 SOL wallet)

**For False Positives:**
- Show evidence and let user judge
- Provide feedback mechanism
- Continuously tune thresholds

### 10.3 Future Enhancements

**Machine Learning:**
- Train models on historical drain data
- Detect novel attack patterns automatically
- Improve confidence scoring

**Cross-Chain Analysis:**
- Detect drains across multiple blockchains
- Identify drainer wallet clusters

**Real-Time Monitoring:**
- Detect drains as they happen
- Alert users immediately
- Potentially block transactions (wallet integration)

---

## Document Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 5, 2025 | Initial detection algorithm specification |