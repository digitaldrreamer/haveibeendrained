# Research Brief: Have I Been Drained - Solana Wallet Security Checker

## Project Context

"Have I Been Drained" is a Solana wallet security checker that analyzes transaction history to detect drains, classifies attack types, and provides recovery guidance. The project includes:
- Detection algorithms analyzing Solana transaction patterns
- On-chain drainer registry using Anchor framework
- Community reporting system with anti-spam protection
- Educational content about wallet security
- Solana Blinks for viral social sharing

**Target Deadline:** December 19, 2025 (14-day hackathon)

**Tech Stack:** Astro + Svelte frontend, Hono API, PostgreSQL, Solana + Anchor, Cloudflare R2, Helius RPC

---

## Research Objectives

For each topic below, please provide:
1. **Current state of technology/practice** (as of December 2025)
2. **Specific implementation guidance** with code examples where applicable
3. **Common pitfalls and how to avoid them**
4. **Recommended tools, libraries, and resources**
5. **Best practices and industry standards**
6. **Cost considerations** (for paid services)

---

## 1. Solana Transaction Parsing and Analysis

### Research Questions

**Transaction Structure:**
- What is the complete structure of a Solana transaction (both legacy and versioned)?
- How do `preTokenBalances` and `postTokenBalances` arrays work, and how do you calculate actual transfer amounts?
- What are inner instructions, and how do they differ from top-level instructions?
- How do you identify the actual token transfers versus balance changes from rent, rewards, or fees?

**Program Interactions:**
- What are the instruction formats for Token Program and Token-2022 Program?
- How do you parse `Transfer`, `Approve`, `SetAuthority`, `Revoke`, and `CloseAccount` instructions?
- What is the instruction data structure for each of these operations?
- How do you extract the delegate address and approval amount from an `Approve` instruction?

**Advanced Features:**
- How do account compression and lookup tables work in Solana transactions?
- What are versioned transactions (v0), and how do they differ from legacy transactions?
- How do you handle transactions with multiple signers?
- What is the `maxSupportedTransactionVersion` parameter, and when should it be set?

**Helius Enhanced API:**
- What parsed data does Helius provide that simplifies transaction analysis?
- What are the differences between `getParsedTransaction` from standard RPC versus Helius Enhanced API?
- Are there any Helius-specific fields or enhancements that would be valuable for drain detection?

### Desired Outputs
- Complete TypeScript type definitions for parsed Solana transactions
- Code examples for extracting token transfers from transaction data
- List of common program IDs to recognize (Token Program, Token-2022, DEXes, etc.)
- Edge cases to handle (failed transactions, self-transfers, multi-hop swaps)

---

## 2. Known Drainer Attack Patterns on Solana

### Research Questions

**Attack Vector Taxonomy:**
- What are all known attack vectors for draining Solana wallets as of December 2025?
- How do "Permit" or "setOwner" drainers work technically? What instructions do they use?
- What is the difference between approval-based drains and ownership transfer drains?
- How do malicious browser extensions intercept and modify transactions?
- What are clipboard hijacking attacks, and how prevalent are they on Solana?

**Sweeper Bot Patterns:**
- What is the typical timing pattern for sweeper bots (time between deposit and withdrawal)?
- Do sweeper bots sweep all tokens or only specific high-value tokens?
- What recipient addresses do sweeper bots typically use (single address, rotating addresses, mixers)?
- Are there any distinctive transaction signatures that identify sweeper bot activity?

**Recent Incidents:**
- What were the major Solana drain incidents in 2024-2025?
- What new attack patterns have emerged recently?
- Are there any attack patterns specific to Solana versus EVM chains?
- What are the most common phishing techniques used to trick Solana users?

**Obfuscation Techniques:**
- How do drainers obfuscate their activity (intermediary wallets, DEX swaps, bridges)?
- What is the typical "cash out" flow for stolen funds on Solana?
- Are there any patterns in how drainers distribute funds across multiple wallets?

### Desired Outputs
- Comprehensive list of attack types with technical descriptions
- Transaction signature examples for each attack type
- Timing patterns and thresholds for detection (e.g., sweeper bot < 10 seconds)
- List of known drainer wallet addresses (if publicly available)
- Red flags that indicate a transaction is malicious

---

## 3. Helius RPC API Capabilities and Limitations

### Research Questions

**Service Tiers and Pricing:**
- What are the current Helius pricing tiers (free, developer, professional, enterprise)?
- What are the rate limits for each tier (requests per second, requests per day)?
- What is the cost per additional request beyond free tier limits?
- Are there any methods that consume more "credits" than others?

**API Methods:**
- What is the complete list of RPC methods supported by Helius?
- What are the differences between standard Solana RPC methods and Helius Enhanced methods?
- How does `getSignaturesForAddress` pagination work (before, until, limit parameters)?
- What is the maximum number of signatures returned per call?
- How does `getParsedTransactions` batching work? What's the maximum batch size?

**Enhanced Features:**
- What is the Helius Enhanced API, and what additional data does it provide?
- Does Helius offer webhook support for real-time transaction monitoring?
- What is the DAS (Digital Asset Standard) API, and how does it work?
- Are there any Helius-specific features for NFT data or token metadata?

**Performance and Reliability:**
- What are typical response times for different methods?
- What is Helius's uptime SLA?
- How should rate limit errors (429) be handled?
- What retry strategies are recommended for transient failures?

**Alternatives:**
- What are the main alternatives to Helius (QuickNode, Alchemy, Triton, public endpoints)?
- How do their pricing and features compare?
- Which providers offer the best parsed transaction data?

### Desired Outputs
- Pricing comparison table for Helius tiers
- Rate limit specifications for each tier
- Code examples for pagination and batching
- Recommended fallback strategy for RPC failures
- Cost estimation for analyzing 1000 wallets per day

---

## 4. Anchor Framework Best Practices and Security

### Research Questions

**PDA (Program Derived Address) Patterns:**
- What are best practices for choosing PDA seeds?
- How do you prevent PDA collisions while keeping addresses queryable?
- Should the bump seed be stored in the account or derived each time?
- What are the performance implications of complex PDA derivation?

**Account Management:**
- How do you calculate the exact account size for rent exemption?
- What happens if you undersize or oversize an account?
- Can accounts be resized after creation (realloc)?
- What are the best practices for account initialization and closing?

**Security Constraints:**
- What are the most important Anchor constraints (`#[account(...)]` macros)?
- How do you prevent common vulnerabilities (account confusion, missing signer checks, etc.)?
- What is the Sealevel Attacks repository, and what vulnerabilities does it document?
- How do you validate that an account is owned by the expected program?

**Events and Logging:**
- How do you emit events in Anchor programs?
- What is the size limit for event data?
- How do off-chain indexers consume these events?
- What are best practices for event design (what data to include)?

**Testing:**
- What testing frameworks are available for Anchor (Bankrun, Solana Test Validator)?
- How do you write integration tests that simulate real blockchain conditions?
- What are best practices for test data generation?
- How do you test error conditions and constraint violations?

**Deployment:**
- What is the process for deploying an Anchor program to devnet and mainnet?
- How do program upgrades work, and what is upgrade authority?
- What are the implications of marking a program as immutable?
- How much SOL is required for program deployment?

### Desired Outputs
- Anchor program template with security best practices
- List of essential constraints for common account types
- Testing strategy with code examples
- Deployment checklist and commands
- Security audit checklist

---

## 5. Existing Drainer Address Databases and Threat Intelligence

### Research Questions

**Public Databases:**
- Does Chainabuse.com have a Solana scam database? Is there an API or bulk export?
- What is Scam Sniffer's coverage of Solana versus EVM chains?
- Does CertiK's SkyNet track Solana drainers? How can data be accessed?
- Are there any Solana-specific scam databases or registries?

**Wallet Provider Blocklists:**
- Do Phantom, Solflare, or Backpack maintain public blocklists of malicious addresses?
- Are these blocklists accessible via API or downloadable?
- How frequently are they updated?

**Blockchain Analytics:**
- Do Chainalysis, Elliptic, or TRM Labs offer Solana threat intelligence?
- What is the pricing for accessing their data?
- Do they provide real-time feeds or batch exports?

**Community Sources:**
- What are the most active Solana security Twitter accounts or Discord servers?
- Are there any community-maintained lists of known drainers?
- What is the format and reliability of community-reported data?

**RPC Provider Features:**
- Does Helius offer address reputation scoring or blocklists?
- Do other RPC providers (QuickNode, Alchemy) offer similar features?

### Desired Outputs
- List of all available drainer address sources with access methods
- Comparison of data quality and update frequency
- Scraper implementation guidance for each source
- Estimated total number of known Solana drainer addresses
- Data format specifications for each source

---

## 6. Token Approval and Revocation Mechanisms

### Research Questions

**Approval Mechanics:**
- How does the Token Program's `Approve` instruction work?
- What is the account structure for storing delegate information?
- How do unlimited approvals work (u64::MAX)?
- What is the difference between `Approve` and `SetAuthority`?

**Revocation:**
- How does the `Revoke` instruction work?
- Can you revoke approvals for multiple tokens in a single transaction?
- What happens to pending transactions when an approval is revoked?

**Token-2022 Enhancements:**
- What are transfer hooks, and how do they affect approvals?
- What are permanent delegates in Token-2022?
- Are there any new approval-related features in Token-2022?

**Querying Approvals:**
- How do you query all current token account delegates for a wallet?
- What RPC methods are used to fetch token account data?
- How do you parse the delegate field from token account data?

**Existing Tools:**
- Does Revoke.cash support Solana, or is it EVM-only?
- Are there any Solana-specific approval revocation tools?
- What tools do Solana wallets provide for managing approvals?

### Desired Outputs
- Code examples for querying current approvals
- Step-by-step guide for revoking approvals
- List of existing Solana approval management tools
- Comparison of Token Program vs Token-2022 approval mechanisms

---

## 7. Solana Blinks (Blockchain Links) Implementation

### Research Questions

**Specification:**
- What is the official Solana Actions specification (as of December 2025)?
- What is the required JSON structure for action metadata?
- What HTTP methods and endpoints are required (GET, POST, OPTIONS)?
- What CORS headers are necessary for Blinks to work?

**Rendering:**
- What Open Graph meta tags are required for proper card rendering?
- How do Blinks render in Twitter, Discord, Telegram, and other platforms?
- What image dimensions and formats are recommended for Blink icons?
- Are there any platform-specific requirements or limitations?

**Implementation:**
- How do you pass parameters through Blinks (e.g., wallet addresses)?
- How is the POST endpoint called, and what data does it receive?
- How do you return transaction data for the wallet to sign?
- What error handling is required for Blinks?

**User Experience:**
- What is the complete user flow when interacting with a Blink?
- How does wallet connection work within a Blink?
- How are results displayed after action execution?
- Can Blinks be used without a wallet connection (read-only actions)?

**Examples and Libraries:**
- Are there any official Solana Blinks examples or templates?
- Are there libraries that simplify Blinks implementation?
- What are some successful Blinks implementations to study?

### Desired Outputs
- Complete Blinks implementation example with code
- Required meta tags and CORS configuration
- User flow diagram for Blink interaction
- Testing checklist for Blinks across platforms

---

## 8. Cloudflare R2 Storage for Evidence Files

### Research Questions

**API and Compatibility:**
- What S3 API methods does R2 support?
- What S3 features are NOT supported in R2?
- What are the differences between R2 and S3 in terms of API behavior?

**Pricing:**
- What is R2's current pricing (storage, operations, egress)?
- What are the free tier limits?
- How does R2 pricing compare to S3, Backblaze B2, and other alternatives?

**Authentication:**
- What authentication methods does R2 support (access keys, IAM, etc.)?
- How do you generate presigned URLs for temporary access?
- Can you use Cloudflare Workers for authentication?

**Upload Strategies:**
- What is the recommended approach for file uploads (direct from browser vs server-side)?
- How do you implement multipart uploads for large files?
- What CORS configuration is needed for browser uploads?

**Security:**
- How do you validate file types and prevent malicious uploads?
- What are best practices for public versus private buckets?
- Can you implement virus scanning for uploaded files?

**Integration:**
- How does R2 integrate with Cloudflare Workers?
- Can you add image processing or thumbnailing?
- What are the options for CDN delivery of R2 files?

### Desired Outputs
- R2 setup guide with authentication configuration
- Code examples for file upload (both browser and server-side)
- CORS configuration for browser uploads
- Security checklist for file uploads
- Cost estimation for storing 10,000 evidence files

---

## 9. PostgreSQL Performance Optimization for High-Frequency Queries

### Research Questions

**Indexing Strategies:**
- What types of indexes are available in PostgreSQL (B-tree, Hash, GIN, GiST, etc.)?
- When should you use each index type?
- How do you create partial indexes for frequently accessed subsets?
- What are the trade-offs of indexing (query speed vs write speed vs storage)?

**JSONB Optimization:**
- How do you efficiently query JSONB columns?
- What indexes work with JSONB (GIN, expression indexes)?
- Should you use JSONB for storing analysis results, or normalize the data?

**Connection Pooling:**
- What connection pooling libraries are available for Node.js (pg-pool, pgbouncer)?
- What are the recommended pool size settings?
- How do you handle connection pool exhaustion?

**Query Optimization:**
- How do you use `EXPLAIN ANALYZE` to identify slow queries?
- What are common query anti-patterns to avoid?
- How do you optimize JOIN queries?

**Maintenance:**
- What are autovacuum settings, and when should you tune them?
- How do you monitor table bloat?
- What are best practices for regular maintenance (VACUUM, ANALYZE, REINDEX)?

**Scaling:**
- When should you consider read replicas?
- How do you implement read replicas with PostgreSQL?
- What are the options for horizontal scaling (sharding, Citus, etc.)?

### Desired Outputs
- Index strategy for the specific schema (drainers, analysis_cache, reports_pending)
- Connection pooling configuration example
- Query optimization checklist
- Monitoring queries for identifying performance issues
- Scaling roadmap for growing from 100 to 10,000+ daily users

---

## 10. Rate Limiting and Anti-Spam Strategies

### Research Questions

**Algorithms:**
- What are the different rate limiting algorithms (token bucket, leaky bucket, fixed window, sliding window)?
- What are the pros and cons of each algorithm?
- Which algorithm is best for API rate limiting?

**Implementation:**
- What rate limiting libraries are available for Node.js/Hono?
- How do you implement distributed rate limiting (Redis-based)?
- What are the trade-offs of in-memory vs distributed rate limiting?

**Dimensions:**
- Should rate limits be per IP, per user, per endpoint, or global?
- How do you handle users behind NAT or shared IPs?
- How do you rate limit authenticated vs anonymous users differently?

**Response Handling:**
- What HTTP status code should be returned for rate limit violations (429)?
- What headers should be included (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After)?
- How do you communicate rate limits to users?

**CAPTCHA Integration:**
- When should CAPTCHA be triggered (after N failed attempts, suspected bot traffic)?
- What CAPTCHA services are available (hCaptcha, reCAPTCHA, Turnstile)?
- How do you integrate CAPTCHA with your API?

**Cloudflare Features:**
- What rate limiting features does Cloudflare provide?
- Can Cloudflare rate limiting replace application-level rate limiting?
- What are the limitations of Cloudflare's free tier rate limiting?

### Desired Outputs
- Rate limiting implementation example for Hono
- Recommended rate limits for different endpoints
- CAPTCHA integration guide
- Cloudflare rate limiting configuration
- Strategy for handling legitimate high-volume users

---

## 11. Web3 Wallet Integration for Report Submission

### Research Questions

**Wallet Adapter:**
- What is the current version of Solana Wallet Adapter (as of December 2025)?
- What wallets does it support (Phantom, Solflare, Backpack, etc.)?
- How do you integrate Wallet Adapter with Svelte?
- Are there any Svelte-specific wallet libraries?

**Connection Flow:**
- How do you detect installed wallets?
- How do you handle the wallet connection request?
- What happens when a user rejects the connection?
- How do you persist wallet connection across page reloads?

**Transaction Signing:**
- How do you build a transaction server-side and send it to the wallet for signing?
- What is the difference between signing a transaction and signing a message?
- How do you handle partial signing (multiple signers)?
- What transaction simulation should be done before sending to wallet?

**Message Signing:**
- How do you request a wallet to sign an arbitrary message?
- What message format should be used for authentication?
- How do you verify the signature server-side?
- How do you prevent replay attacks with nonces?

**Mobile Support:**
- How does wallet integration work on mobile browsers?
- What is WalletConnect, and how does it work with Solana?
- What are deep linking strategies for mobile wallets?

**Error Handling:**
- What are common wallet errors (user rejection, insufficient balance, network mismatch)?
- How do you handle wallet disconnection mid-session?
- How do you handle wallet switching (user changes wallet)?

### Desired Outputs
- Wallet Adapter integration example for Svelte
- Transaction building and signing flow with code examples
- Message signing for authentication example
- Mobile wallet integration guide
- Error handling patterns for common wallet issues

---

## 12. Educational Content Strategy for Security Awareness

### Research Questions

**Existing Resources:**
- What wallet security guides exist from Phantom, Solflare, Solana Foundation?
- What topics do they cover, and what gaps exist?
- What is the reading level and technical depth of existing guides?

**User Misconceptions:**
- What are common misconceptions about wallet security?
- Do users understand the difference between hot and cold wallets?
- Do users know what a seed phrase is and why it's critical?
- What do users misunderstand about transaction signing?

**Attack Awareness:**
- What percentage of users can recognize a phishing attempt?
- What are the most common red flags that users miss?
- How do you explain technical attacks (like Permit drainers) to non-technical users?

**Content Structure:**
- What information architecture works best for security content?
- Should content be organized by topic, by threat type, or by user level?
- What is the optimal length for security articles?
- Should you use interactive elements (quizzes, simulations)?

**Accessibility:**
- What reading level should security content target?
- Should content be available in multiple languages?
- What accessibility considerations are important (screen readers, color contrast)?

**SEO and Discovery:**
- What keywords do users search for when looking for wallet security information?
- How do you optimize security content for search engines?
- What are the most linked-to security resources?

### Desired Outputs
- Content outline for /learn section (topics and structure)
- Writing guidelines (tone, reading level, technical depth)
- List of common misconceptions to address
- Interactive element ideas (if applicable)
- SEO keyword research for wallet security topics

---

## 13. Frontend Performance Optimization for Fast Load Times

### Research Questions

**Astro Optimization:**
- What is Astro's partial hydration model, and how does it work?
- How do you minimize JavaScript shipped to the browser?
- What is the difference between static, server, and hybrid rendering in Astro?
- How do you implement code splitting in Astro?

**Svelte Islands:**
- How do Svelte islands work in Astro?
- How do you ensure islands hydrate independently?
- What is the performance impact of multiple islands on a page?
- How do you lazy load islands?

**Image Optimization:**
- What modern image formats should be used (WebP, AVIF)?
- How do you implement responsive images?
- What is the Astro Image component, and how does it work?
- Should images be served from a CDN?

**Font Optimization:**
- What are best practices for web font loading?
- Should you use system fonts, Google Fonts, or self-hosted fonts?
- How do you implement font subsetting?
- What is the FOUT (Flash of Unstyled Text) problem, and how do you prevent it?

**Critical CSS:**
- What is critical CSS extraction?
- How do you inline above-the-fold CSS?
- How do you defer non-critical CSS?

**Prefetching and Preloading:**
- When should you use prefetch vs preload?
- How do you implement link prefetching for likely navigation targets?
- What are the trade-offs of aggressive prefetching?

**Core Web Vitals:**
- What are the current Core Web Vitals metrics (LCP, FID/INP, CLS)?
- What are the target values for each metric?
- How do you measure Core Web Vitals?
- What are common causes of poor Core Web Vitals scores?

### Desired Outputs
- Astro configuration for optimal performance
- Image optimization strategy with code examples
- Font loading strategy
- Lighthouse audit checklist
- Performance budget recommendations

---

## 14. Error Handling and Observability Best Practices

### Research Questions

**Structured Logging:**
- What is structured logging, and why is it important?
- What log formats are commonly used (JSON, logfmt)?
- What fields should be included in every log entry?
- How do you handle sensitive data in logs?

**Log Aggregation:**
- What log aggregation tools are available (Loki, Elasticsearch, Datadog, Better Stack)?
- What are the trade-offs of self-hosted vs managed solutions?
- How do you ship logs from a VPS to an aggregation service?

**Error Tracking:**
- What error tracking services are available (Sentry, Rollbar, Bugsnag)?
- What is Sentry's pricing for a project with 10,000 daily users?
- How do you integrate error tracking with your application?
- What error context should be captured (user, request, environment)?

**Metrics and Monitoring:**
- What metrics should be collected (request rate, error rate, latency, saturation)?
- What tools are available for metrics collection (Prometheus, Grafana, Cloudflare Analytics)?
- How do you implement custom metrics in your application?

**Alerting:**
- What metrics should trigger alerts?
- How do you set alert thresholds to avoid false positives?
- What alerting channels are available (email, Slack, PagerDuty)?
- How do you implement on-call rotations for a small team?

**Health Checks:**
- What should a health check endpoint verify?
- How do you implement deep health checks (database, RPC, external services)?
- What is the difference between liveness and readiness probes?

**Distributed Tracing:**
- What is distributed tracing, and when is it needed?
- What tools are available (Jaeger, Zipkin, OpenTelemetry)?
- Is distributed tracing overkill for a monolithic API?

### Desired Outputs
- Logging strategy with code examples
- Error tracking integration guide
- Metrics collection and visualization setup
- Alerting rules and thresholds
- Health check endpoint implementation

---

## 15. Deployment and DevOps for VPS Hosting

### Research Questions

**Platform Comparison:**
- What is Dokploy, and how does it work?
- What is Coolify, and how does it compare to Dokploy?
- What are alternatives (CapRover, Dokku, Caprover)?
- What are the pros and cons of each platform?

**Docker Best Practices:**
- How do you structure a Dockerfile for optimal build caching?
- What are multi-stage builds, and when should you use them?
- How do you minimize Docker image size?
- What are best practices for Docker Compose for multi-container apps?

**Environment Management:**
- How do you manage environment variables in production?
- What secrets management solutions are available?
- How do you rotate secrets without downtime?

**SSL/TLS:**
- How does Let's Encrypt work?
- How do you automate certificate renewal?
- What is Certbot, and how do you use it?
- What are alternatives to Let's Encrypt?

**Reverse Proxy:**
- What is the difference between Nginx and Caddy?
- Which reverse proxy is easier to configure?
- How do you configure a reverse proxy for an API and static files?
- How do you implement rate limiting at the reverse proxy level?

**Zero-Downtime Deployment:**
- What are blue-green deployments?
- What are rolling updates?
- How do you implement zero-downtime deployments with Docker?
- How do you handle database migrations during deployment?

**Backup Strategy:**
- How do you automate PostgreSQL backups?
- How do you backup uploaded files (R2)?
- What is point-in-time recovery, and how do you implement it?
- Where should backups be stored (same VPS, different region, different provider)?

**VPS Provider Selection:**
- What VPS providers are recommended (DigitalOcean, Linode, Hetzner, Vultr)?
- What are the pricing differences?
- What are the performance differences?
- What regions are available?

### Desired Outputs
- Dokploy vs Coolify comparison with recommendation
- Dockerfile and Docker Compose examples
- SSL/TLS setup guide
- Reverse proxy configuration examples
- Deployment checklist and rollback procedure
- Backup automation scripts
- VPS provider comparison and recommendation

---

## Research Deliverables

For each of the 15 research areas above, please provide:

1. **Executive Summary** (2-3 paragraphs)
   - Current state of the technology/practice
   - Key findings and recommendations
   - Critical considerations for this project

2. **Detailed Findings** (organized by research questions)
   - Comprehensive answers to each question
   - Code examples where applicable
   - Links to official documentation and resources

3. **Recommendations** (specific to this project)
   - Recommended tools, libraries, and services
   - Specific configuration values and thresholds
   - Implementation priorities

4. **Pitfalls and Gotchas**
   - Common mistakes to avoid
   - Edge cases to handle
   - Performance or security considerations

5. **Cost Analysis** (where applicable)
   - Pricing for paid services
   - Cost estimation for expected usage
   - Free tier limitations

6. **Resources and References**
   - Official documentation links
   - Tutorial and guide links
   - Example implementations
   - Community resources (Discord, forums, etc.)

---

## Priority Ranking

Please prioritize research in this order:

**Critical (Complete First):**
1. Solana Transaction Parsing and Analysis
2. Helius RPC API Capabilities and Limitations
3. Known Drainer Attack Patterns on Solana
4. Anchor Framework Best Practices and Security

**High Priority (Complete Second):**
5. Existing Drainer Address Databases and Threat Intelligence
6. PostgreSQL Performance Optimization
7. Web3 Wallet Integration
8. Deployment and DevOps for VPS Hosting

**Medium Priority (Complete Third):**
9. Token Approval and Revocation Mechanisms
10. Rate Limiting and Anti-Spam Strategies
11. Cloudflare R2 Storage
12. Frontend Performance Optimization

**Lower Priority (Complete Last):**
13. Solana Blinks Implementation
14. Educational Content Strategy
15. Error Handling and Observability

---

## Research Timeline

Given the December 19, 2025 deadline, research should be completed by **December 8, 2025** (2 days) to allow 10 days for implementation.

Please provide research results in a structured format (markdown preferred) with clear sections for each topic.
