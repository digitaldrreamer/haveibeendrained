# Have I Been Drained - Technical Implementation Guide

## Document Overview

This guide provides high-level technical specifications for implementing the "Have I Been Drained" wallet security checker. It focuses on architectural decisions, data flow patterns, integration requirements, and critical implementation considerations without prescribing specific code patterns.

---

## 1. Technology Stack Decisions

### 1.1 Frontend Layer

**Astro Framework**
- Static site generation for marketing pages (landing, about, learn articles)
- Server-side rendering for dynamic results pages (personalized per wallet check)
- Svelte islands for interactive components (wallet input, report form, share modal)
- Must support full TypeScript type checking despite JSDoc preference for backend
- Build output should be deployable as static files with API proxy configuration

**Critical Considerations:**
- Results pages must be cacheable but personalized - implement cache keys based on wallet address
- Svelte islands must hydrate independently without blocking page load
- Static pages should achieve Lighthouse score >90 for performance
- Must support meta tags for Twitter/Discord card rendering (Open Graph protocol)

### 1.2 API Layer

**Hono Framework**
- Lightweight HTTP server with minimal dependencies
- Support for middleware chaining (CORS, rate limiting, validation)
- Must handle both REST endpoints and Solana Actions protocol
- Should support graceful shutdown and health checks
- Error handling must distinguish between user errors (4xx) and system errors (5xx)

**Critical Considerations:**
- All endpoints must validate inputs before processing (wallet address format, file size, etc.)
- Rate limiting per IP address to prevent abuse (100 requests/hour for free tier)
- Request/response logging for debugging without exposing sensitive data
- Support for streaming responses if analysis takes >5 seconds
- CORS configuration must allow Solana wallet domains and social platforms

### 1.3 Database Layer

**PostgreSQL**
- Primary data store for known drainer addresses
- Analysis result caching to reduce RPC costs
- Transaction history for on-chain report submissions
- Must support concurrent reads and writes
- Index strategy critical for query performance

**Critical Considerations:**
- Connection pooling to handle concurrent requests (minimum 10 connections)
- Prepared statements for all queries to prevent SQL injection
- Regular vacuum/analyze operations for query plan optimization
- Backup strategy must include point-in-time recovery capability
- Migration system for schema changes (recommend using a migration tool)

### 1.4 Blockchain Integration

**Solana Web3.js**
- Transaction fetching and parsing via Helius RPC
- Must handle rate limits gracefully with exponential backoff
- Support for both confirmed and finalized commitment levels
- Parse both native SOL transfers and SPL token transfers
- Handle versioned transactions (maxSupportedTransactionVersion: 0)

**Anchor Framework**
- On-chain program for drainer report registry
- Program deployment to both devnet (testing) and mainnet (production)
- IDL generation for client-side interaction
- Must handle account rent exemption calculations

**Critical Considerations:**
- RPC failover strategy if Helius is unavailable (fallback to public endpoints)
- Transaction signature caching to avoid redundant RPC calls
- Proper handling of base58 encoding/decoding edge cases
- Account deserialization must handle legacy and current account formats
- PDA derivation must be deterministic and match on-chain program

---

## 2. System Architecture Patterns

### 2.1 Request Flow Architecture

**Stateless API Design**
- Each API request is independent - no session state on server
- Authentication via wallet signature when required (report submission)
- Analysis results cached by wallet address, not user session
- All data needed for response must come from request or database

**Caching Strategy**
- Analysis results cached for 1 hour per wallet address
- Cache invalidation on new on-chain reports for that address
- Cache warming for commonly checked addresses (top 100 drainers)
- CDN caching for static assets (30 days) and API responses (5 minutes for safe wallets)

**Error Recovery**
- Partial failures should return partial results (e.g., analysis succeeds but on-chain query fails)
- Retry logic for transient failures (RPC timeouts, network errors)
- Circuit breaker pattern for external dependencies (after 5 failures, stop trying for 60 seconds)
- User-facing errors must be actionable (tell user what to do, not just what went wrong)

### 2.2 Data Flow Patterns

**Analysis Pipeline**
- Sequential stages: fetch → parse → detect → classify → recommend
- Each stage produces output consumed by next stage
- Stage failures should be isolated (one detection method failing doesn't block others)
- All stages must complete within 15-second timeout
- Progress indicators should reflect actual pipeline stages

**Report Submission Flow**
- Client-side: form validation → evidence upload → transaction building
- Server-side: validate inputs → upload to R2 → build Solana transaction → return for signing
- Client-side: wallet signs → submits to Solana
- Server-side: monitors transaction → updates database on confirmation
- Asynchronous confirmation tracking (don't block user waiting for finalization)

### 2.3 Scalability Considerations

**Horizontal Scaling Readiness**
- All state in database or external services (no in-memory state)
- No file system dependencies (use R2 for file storage)
- Load balancer can distribute requests across multiple API instances
- Database connection pooling with maximum connection limits

**Rate Limiting Strategy**
- Per-IP limits for anonymous users (100 checks/hour)
- Per-wallet limits for report submissions (5 reports/day to prevent spam)
- Global rate limits for RPC calls (1000/hour to stay within Helius free tier)
- Implement token bucket algorithm for smooth rate limiting

**Cost Optimization**
- Cache aggressively to minimize RPC calls (most expensive operation)
- Batch RPC requests where possible (fetch multiple transactions in single call)
- Use CDN for static assets to reduce origin server load
- Implement query result pagination for large result sets

---

## 3. External Service Integration

### 3.1 Helius RPC Integration

**Connection Management**
- Maintain persistent HTTP connection with keep-alive
- Configure timeout values: connect (5s), read (30s), total (45s)
- Implement retry logic with exponential backoff (1s, 2s, 4s, max 3 retries)
- Monitor rate limit headers and throttle requests proactively

**API Usage Patterns**
- Use `getSignaturesForAddress` with pagination for wallets with >1000 transactions
- Prefer `getParsedTransaction` over `getTransaction` to avoid manual parsing
- Use `confirmed` commitment for user-facing queries (balance speed and reliability)
- Use `finalized` commitment for report confirmations (ensure immutability)

**Error Handling**
- Distinguish between rate limit errors (429), network errors, and invalid data errors
- Rate limit errors trigger exponential backoff
- Network errors trigger immediate retry with different endpoint if available
- Invalid data errors return user-friendly error messages

**Cost Management**
- Track RPC call count per hour and per day
- Alert when approaching 80% of free tier limit
- Implement circuit breaker to prevent overage charges
- Cache results aggressively (1 hour for analysis, 24 hours for known drainers)

### 3.2 Cloudflare R2 Integration

**Upload Strategy**
- Accept files up to 5MB in size
- Validate MIME types before upload (images, PDFs, text only)
- Generate unique keys using: `evidence/{sha256_hash}.{extension}`
- Set appropriate metadata: upload timestamp, uploader wallet, drainer address

**Access Control**
- Evidence files should be publicly readable (no authentication required)
- Upload requires authentication (wallet signature verification)
- Implement signed URLs for temporary access if needed
- No delete operation exposed via API (prevent evidence tampering)

**Error Handling**
- Upload failures should not block report submission (evidence optional)
- Retry uploads once on network failure
- Fall back to submitting report without evidence if upload consistently fails
- Log all upload errors for debugging

### 3.3 Plunk Email Integration

**Use Cases**
- Confirmation emails after report submission (optional, not MVP)
- Alert emails for future monitoring feature (post-hackathon)
- Security notifications (e.g., mass drain events)

**Implementation Requirements**
- Template-based emails with variable substitution
- Unsubscribe links in all emails (legal requirement)
- Bounce and complaint handling
- Rate limiting to stay within free tier (3000/month)

**Integration Approach**
- Queue email sends asynchronously (don't block API responses)
- Batch emails when possible (daily digest vs individual notifications)
- Track delivery status and retry failed sends
- Respect user opt-out preferences

### 3.4 Solana Blockchain Integration

**RPC Method Usage**
- `getSignaturesForAddress`: Fetch transaction history
- `getParsedTransaction`: Get detailed transaction data
- `getAccountInfo`: Fetch on-chain report accounts
- `sendTransaction`: Submit report transactions
- `confirmTransaction`: Verify transaction confirmation

**Transaction Parsing Requirements**
- Extract all token transfers (both SPL tokens and native SOL)
- Identify transfer direction (incoming vs outgoing)
- Parse token metadata (mint address, decimals, amount)
- Handle both legacy and versioned transaction formats
- Detect approval/delegate instructions in token programs

**Program Interaction**
- Use Anchor TypeScript client for type-safe interaction
- Derive PDAs deterministically using documented seeds
- Handle account creation fees (rent exemption)
- Simulate transactions before submission to catch errors early
- Monitor program logs for debugging

---

## 4. Security Requirements

### 4.1 Input Validation

**Wallet Address Validation**
- Must be valid base58 string
- Length between 32-44 characters
- Must decode to valid 32-byte public key
- Reject obviously invalid addresses (all zeros, all ones)
- Consider implementing checksum validation

**File Upload Validation**
- Maximum file size: 5MB (enforced before upload begins)
- Allowed MIME types: image/png, image/jpeg, application/pdf, text/plain
- Scan file headers to verify MIME type (don't trust client-provided value)
- Reject files with executable extensions or suspicious content
- Consider antivirus scanning for uploaded files

**Form Input Validation**
- Sanitize all text inputs to prevent XSS
- Validate evidence URLs are properly formatted
- Limit description field to 1000 characters
- Strip HTML tags from user-provided text

### 4.2 Authentication & Authorization

**Wallet Signature Verification**
- Report submissions require wallet signature
- Signature must include nonce to prevent replay attacks
- Verify signature matches claimed wallet address
- Signature expiry: 5 minutes from generation
- Rate limit signature verification attempts (prevent brute force)

**API Key Management**
- Helius API key must be stored as environment variable
- Never expose API keys in client-side code or logs
- Rotate API keys periodically (quarterly)
- Monitor for unauthorized API key usage

**CORS Configuration**
- Allow Origins: wallet domains, social platforms for blinks
- Allow Methods: GET, POST, OPTIONS
- Allow Headers: Content-Type, Authorization
- Credentials: false (no cookies)

### 4.3 Data Privacy

**User Data Handling**
- Never store private keys or seed phrases
- Wallet addresses are public data - no additional privacy needed
- Evidence files may contain sensitive info - implement access controls
- Analysis results contain no PII - safe to cache

**Compliance Considerations**
- Privacy policy must disclose data collection practices
- Terms of service must limit liability for false positives/negatives
- No user tracking beyond basic analytics
- Respect Do Not Track headers if present

**Logging & Monitoring**
- Log all API requests with timestamp, IP, endpoint, status code
- Never log sensitive data (API keys, file contents, full wallet addresses in public logs)
- Implement log rotation to prevent disk space issues
- Set up alerts for unusual patterns (spike in errors, slow responses)

### 4.4 Attack Surface Mitigation

**DDoS Protection**
- Cloudflare provides basic DDoS protection
- Implement application-level rate limiting
- Use CAPTCHA for suspected bot traffic
- Monitor for sudden traffic spikes and respond accordingly

**SQL Injection Prevention**
- Use parameterized queries exclusively
- Never concatenate user input into SQL strings
- Regularly audit database queries for vulnerabilities
- Use ORM or query builder with built-in protections

**XSS Prevention**
- Escape all user-provided content before rendering
- Use Content Security Policy headers
- Sanitize inputs on server side, not just client side
- Avoid dangerouslySetInnerHTML or equivalent patterns

**CSRF Prevention**
- Not applicable for stateless API with wallet signatures
- Consider CSRF tokens for future session-based features
- Same-Site cookie attribute for any future cookies

---

## 5. Performance Requirements

### 5.1 Response Time Targets

**Critical User Flows**
- Landing page: <2.5s LCP (Largest Contentful Paint)
- Wallet analysis: <15s P95 (95th percentile)
- Report submission: <5s (excluding wallet signature time)
- Educational pages: <2s LCP
- API health check: <100ms

**Optimization Strategies**
- Lazy load non-critical JavaScript
- Prefetch likely navigation targets
- Implement progressive rendering for results
- Stream analysis results as they become available
- Use service workers for offline capability (future enhancement)

### 5.2 Caching Strategy

**Client-Side Caching**
- Static assets: 30 days with versioned URLs
- API responses: Respect Cache-Control headers
- Analysis results: No client-side cache (always fresh)
- Educational content: 7 days

**Server-Side Caching**
- Analysis results: 1 hour in PostgreSQL
- Known drainer lookups: 24 hours in PostgreSQL
- RPC responses: 5 minutes in memory
- Static page builds: Until deployment

**CDN Caching**
- Static assets: Cache forever with cache busting
- API responses: 5 minutes for safe results, no cache for drained
- HTML pages: No cache (personalized content)

### 5.3 Database Performance

**Query Optimization**
- Index on drainers.address (primary key already indexed)
- Composite index on analysis_cache(wallet_address, expires_at)
- Consider partial index on drainers(report_count) for popular drainers
- Avoid N+1 queries - batch related lookups

**Connection Management**
- Use connection pooling (minimum 10, maximum 50 connections)
- Set reasonable connection timeout (30 seconds)
- Implement connection health checks
- Gracefully handle connection pool exhaustion

**Data Volume Management**
- Implement analysis_cache cleanup job (hourly)
- Archive old reports after 90 days
- Monitor table sizes and plan for sharding if needed
- Consider read replicas for future scaling

---

## 6. Testing Requirements

### 6.1 Test Coverage Expectations

**Unit Testing**
- All detection heuristics must have unit tests
- All database queries must have tests with mock data
- All input validation functions must be tested
- Target: >80% code coverage for critical paths

**Integration Testing**
- API endpoints must have integration tests
- Database operations must be tested with real database (test instance)
- RPC interactions should use mocked responses (avoid real RPC calls in tests)
- Anchor program must have integration tests on localnet

**End-to-End Testing**
- Critical user flows must have E2E tests (check wallet, submit report)
- Test with real wallet addresses (known safe and known drained)
- Test Solana Blinks rendering in at least one platform
- Test error scenarios (invalid address, RPC timeout, etc.)

### 6.2 Test Data Requirements

**Known Safe Wallets**
- At least 5 wallet addresses verified as safe
- Variety of transaction patterns (active trader, HODLer, empty wallet)
- Include wallets with many transactions (>1000) for performance testing

**Known Drained Wallets**
- At least 10 wallet addresses with confirmed drains
- Cover all attack types (Permit, setOwner, seed compromise)
- Include variety of drain patterns (single asset, multi-asset, sweeper bot)
- Document expected detection results for each test wallet

**Test Drainer Addresses**
- Seed database with 1000+ known drainer addresses
- Include addresses with high report counts and low report counts
- Include addresses from different sources (Chainabuse, manual curation)
- Mark test addresses clearly to avoid confusion with production data

### 6.3 Validation Criteria

**Detection Accuracy**
- False positive rate: <5% (incorrectly flagging safe wallets)
- False negative rate: <10% (missing actual drains)
- True positive rate: >90% (correctly identifying drains)
- Measured against curated test set of 100+ wallets

**Performance Benchmarks**
- Analysis completes in <15s for 95th percentile
- Database queries complete in <100ms
- RPC calls complete in <5s
- Page loads complete in <2.5s LCP

**Functional Correctness**
- All attack types correctly classified
- All recovery recommendations appropriate for attack type
- On-chain reports correctly stored and queryable
- Blinks render correctly in Twitter and Discord

---

## 7. Deployment Requirements

### 7.1 Environment Configuration

**Required Environment Variables**
- `HELIUS_API_KEY`: Helius RPC endpoint API key
- `DATABASE_URL`: PostgreSQL connection string
- `R2_ACCOUNT_ID`: Cloudflare R2 account ID
- `R2_ACCESS_KEY_ID`: Cloudflare R2 access key
- `R2_SECRET_ACCESS_KEY`: Cloudflare R2 secret key
- `R2_BUCKET_NAME`: Name of R2 bucket for evidence uploads
- `PLUNK_API_KEY`: Plunk email API key (optional for MVP)
- `ANCHOR_PROVIDER_URL`: Solana RPC URL for Anchor program
- `ANCHOR_WALLET`: Path to wallet keypair for program deployment
- `PROGRAM_ID`: Deployed Anchor program ID

**Configuration Management**
- Use .env files for local development
- Use platform-specific secret management for production
- Never commit .env files to version control
- Document all environment variables in README

### 7.2 VPS Setup Requirements

**Server Specifications**
- Minimum: 2 vCPU, 4GB RAM, 40GB SSD
- Recommended: 4 vCPU, 8GB RAM, 80GB SSD
- Operating System: Ubuntu 22.04 LTS or similar
- Docker and Docker Compose installed

**Container Orchestration**
- Use Dokploy or Coolify for deployment
- Configure automatic restarts on failure
- Set resource limits (CPU, memory) per container
- Implement health checks for automatic recovery

**Network Configuration**
- Firewall rules: Allow 80, 443, block all others
- SSL/TLS certificates via Let's Encrypt
- Configure reverse proxy (nginx or Caddy)
- Set up DNS records pointing to VPS IP

**Monitoring Setup**
- CPU and memory usage monitoring
- Disk space monitoring (alert at 80% full)
- Application error rate monitoring
- RPC quota usage monitoring
- Database connection pool monitoring

### 7.3 Deployment Process

**Pre-Deployment Checklist**
- All tests passing
- Environment variables configured
- Database migrations applied
- Anchor program deployed to target network
- DNS records configured
- SSL certificates valid

**Deployment Steps**
- Build frontend (Astro build process)
- Build API (ensure all dependencies installed)
- Run database migrations
- Deploy containers via Dokploy/Coolify
- Verify health check endpoint responding
- Test critical user flow (wallet check)
- Monitor logs for errors

**Rollback Plan**
- Keep previous container images
- Document rollback procedure
- Test rollback in staging environment
- Have database backup ready
- Monitor closely after rollback

### 7.4 Post-Deployment Verification

**Smoke Tests**
- Health check endpoint returns 200
- Landing page loads correctly
- Wallet check completes successfully
- Known drainer lookup works
- Report submission flow functional
- Blinks render in Twitter

**Performance Verification**
- Response times within SLA
- No memory leaks (monitor over 24 hours)
- Database connection pool stable
- RPC calls succeeding

**Monitoring Setup**
- Error tracking configured (Sentry or similar)
- Uptime monitoring configured (UptimeRobot or similar)
- Log aggregation working
- Alert rules configured

---

## 8. Critical Implementation Notes

### 8.1 Solana-Specific Considerations

**Transaction Parsing Complexity**
- Solana transactions can have multiple instructions
- Instructions can be nested (inner instructions)
- Token transfers can occur in various program contexts
- Must handle both Token Program and Token-2022 Program
- Account compression adds complexity (lookup tables)

**RPC Endpoint Reliability**
- Public RPC endpoints are unreliable for production
- Rate limits vary by provider and plan
- Some methods not available on all endpoints
- Network congestion affects response times
- Plan for RPC provider failover

**Program Account Management**
- PDAs require rent exemption (minimum SOL balance)
- Account size determines rent amount
- Realloc not possible - accounts are fixed size
- Account ownership determines who can modify
- Closed accounts can be recreated at same address

### 8.2 Detection Algorithm Considerations

**Temporal Clustering Detection**
- Must account for legitimate multi-asset transfers (DEX trades)
- Time window should be configurable (default 5 minutes)
- Asset count threshold should be configurable (default 3)
- Consider transaction signature patterns (similar signers = likely legitimate)

**Sweeper Bot Detection**
- Legitimate users might also move funds quickly
- Consider deposit amount (sweeper bots don't discriminate)
- Check recipient address against known patterns
- Multiple sweep events = higher confidence

**Known Drainer Database**
- Requires regular updates from threat intelligence sources
- False positives possible (address reuse, legitimate businesses)
- Should include metadata (report count, first seen, source)
- Consider implementing address reputation score

**Attack Type Classification**
- Multiple attack types can co-exist in single wallet
- Classification should be based on most recent drain
- Consider severity when multiple types detected
- Provide evidence for classification decision

### 8.3 User Experience Considerations

**Loading States**
- Never show blank screen - always show progress
- Educational tips during analysis reduce perceived wait time
- Progress bar should reflect actual progress, not fake animation
- Allow cancellation of long-running analysis

**Error Messages**
- Distinguish between user error and system error
- Provide actionable guidance (what to do next)
- Avoid technical jargon ("RPC timeout" → "Network temporarily unavailable")
- Include support contact for unrecoverable errors

**Result Presentation**
- Lead with most important information (SAFE/AT_RISK/DRAINED)
- Use color coding consistently (green = safe, yellow = warning, red = danger)
- Show evidence for decisions (transaction links, drainer metadata)
- Provide context for non-technical users

**Recovery Guidance**
- Tailor recommendations to specific attack type
- Prioritize actions by urgency
- Include links to external tools (Revoke.cash)
- Warn about irreversible actions (abandoning wallet)

### 8.4 Maintenance & Operations

**Regular Maintenance Tasks**
- Update drainer database weekly (scrape threat intelligence sources)
- Review and update detection heuristics monthly
- Rotate API keys quarterly
- Update dependencies monthly (security patches)
- Review logs weekly for anomalies

**Incident Response Plan**
- Define severity levels (P0 = site down, P1 = degraded, P2 = minor)
- Document escalation procedures
- Maintain on-call rotation (if team grows)
- Post-mortem process for major incidents
- Communication plan for user-facing issues

**Capacity Planning**
- Monitor growth in wallet checks per day
- Track database growth rate
- Monitor RPC usage trends
- Plan for scaling before reaching limits
- Budget for infrastructure growth

**Cost Monitoring**
- Track RPC costs (most significant variable cost)
- Monitor R2 storage and transfer costs
- Track VPS resource utilization
- Set budget alerts for external services
- Optimize expensive operations based on usage patterns

---

## 9. Success Metrics

### 9.1 Hackathon Demo Metrics

**Functional Completeness**
- All MVP features implemented and working
- At least 100 wallet checks completed (seed with test addresses)
- At least 10 community reports submitted
- Blinks render correctly in at least one platform
- Zero critical bugs during judging

**Technical Excellence**
- Clean, well-structured code
- Comprehensive README with setup instructions
- Working demo deployed and accessible
- Anchor program deployed to devnet/mainnet
- Open-source repository with proper licensing

**User Experience**
- Intuitive interface requiring no instructions
- Analysis completes in <15s consistently
- Clear, actionable results for all cases
- Educational content demonstrates thought leadership
- Share functionality encourages viral growth

### 9.2 Post-Hackathon Growth Metrics

**Adoption Metrics**
- Daily active users (wallet checks per day)
- Unique wallets checked
- Return user rate (users checking multiple wallets)
- Community reports submitted per day
- Social media mentions and shares

**Quality Metrics**
- Detection accuracy (validated against known test set)
- False positive rate
- User satisfaction (survey or feedback)
- Average analysis completion time
- System uptime percentage

**Engagement Metrics**
- Time spent on educational content
- Report submission rate (% of drained wallets that submit reports)
- Blink shares on social media
- Wallet partnership integrations
- GitHub stars and forks

---

## Document Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 5, 2025 | Initial technical implementation guide |