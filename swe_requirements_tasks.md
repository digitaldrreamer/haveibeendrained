# SWE Requirements & Granular Task List

## Document Purpose

This document breaks down the "Have I Been Drained" project into discrete, actionable engineering tasks. Each task includes acceptance criteria, dependencies, estimated effort, and priority level for the December 19, 2025 hackathon deadline.

---

## Project Timeline

**Total Duration:** 14 days (Dec 5 - Dec 19, 2025)  
**Available Work Days:** 12 days (accounting for buffer)  
**Critical Path:** Anchor Program → API Backend → Frontend Integration

---

## Task Categories

- **[INFRA]** Infrastructure & DevOps
- **[ANCHOR]** Solana Anchor Program
- **[API]** Backend API Development
- **[FRONTEND]** Frontend Development
- **[DATA]** Database & Data Management
- **[INTEGRATION]** Third-Party Integrations
- **[TEST]** Testing & Quality Assurance
- **[DEPLOY]** Deployment & Launch
- **[DOC]** Documentation

---

## Task Priority Levels

- **P0 (Critical):** Must complete for functional MVP
- **P1 (High):** Important for hackathon demo quality
- **P2 (Medium):** Nice-to-have, enhances experience
- **P3 (Low):** Post-hackathon work

---

## Phase 1: Foundation (Days 1-3)

### INFRA-001: Development Environment Setup
**Priority:** P0  
**Estimated Effort:** 4 hours  
**Dependencies:** None  

**Tasks:**
- Create project repository on GitHub
- Initialize monorepo structure (frontend/, api/, anchor/, shared/)
- Set up package.json with workspace configuration
- Configure TypeScript/JSDoc for respective components
- Set up git hooks for linting and formatting
- Create .env.example files for all components
- Document setup instructions in README

**Acceptance Criteria:**
- Repository structure matches documented architecture
- All developers can clone and run locally within 15 minutes
- No secrets committed to repository
- README includes clear setup steps

---

### INFRA-002: Local Development Stack
**Priority:** P0  
**Estimated Effort:** 3 hours  
**Dependencies:** INFRA-001

**Tasks:**
- Set up Docker Compose for local PostgreSQL
- Configure database initialization scripts
- Set up local Solana validator (solana-test-validator)
- Create development scripts (start, stop, reset)
- Document port assignments and service URLs

**Acceptance Criteria:**
- Single command starts entire local stack
- PostgreSQL accessible at localhost:5432
- Solana validator at localhost:8899
- Services persist data between restarts
- Clear error messages if ports already in use

---

### DATA-001: Database Schema Implementation
**Priority:** P0  
**Estimated Effort:** 4 hours  
**Dependencies:** INFRA-002

**Tasks:**
- Create migration system (recommend node-pg-migrate)
- Write migration: create drainers table
- Write migration: create analysis_cache table
- Write migration: create reports_pending table
- Add indexes on frequently queried columns
- Seed development database with test data
- Create database connection pool configuration

**Schema Requirements:**

**drainers table:**
- address (VARCHAR(64), PRIMARY KEY)
- chain (VARCHAR(16), default 'solana')
- report_count (INTEGER, default 1)
- first_reported (TIMESTAMPTZ, default NOW())
- last_reported (TIMESTAMPTZ, default NOW())
- source (VARCHAR(64), e.g., 'chainabuse', 'onchain', 'manual')
- on_chain_confirmed (BOOLEAN, default false)
- evidence_url (TEXT, nullable)
- metadata (JSONB, nullable, for future extensibility)

**analysis_cache table:**
- wallet_address (VARCHAR(64), PRIMARY KEY)
- result (JSONB, stores full DrainAnalysis object)
- expires_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ, default NOW())

**reports_pending table:**
- id (SERIAL, PRIMARY KEY)
- drainer_address (VARCHAR(64))
- reporter_address (VARCHAR(64))
- evidence_hash (VARCHAR(64))
- evidence_url (TEXT, nullable)
- transaction_signature (VARCHAR(88), nullable)
- status (VARCHAR(16), e.g., 'pending', 'confirmed', 'failed')
- created_at (TIMESTAMPTZ)
- confirmed_at (TIMESTAMPTZ, nullable)

**Acceptance Criteria:**
- Migrations run successfully on fresh database
- All indexes created correctly
- Foreign key constraints where appropriate
- Can rollback migrations cleanly
- Seed data includes 100+ test drainer addresses

---

### DATA-002: Drainer Database Seeding
**Priority:** P0  
**Estimated Effort:** 6 hours  
**Dependencies:** DATA-001

**Tasks:**
- Research and identify drainer address sources
- Write scraper for Chainabuse.com Solana scams
- Write scraper for Scam Sniffer reports (if API available)
- Manually curate top 100 known Solana drainers from security Twitter
- Parse and normalize addresses (base58 validation)
- Deduplicate addresses across sources
- Write bulk insert script with conflict handling
- Verify insert success (count total records)

**Target:**
- Minimum 1,000 unique drainer addresses
- At least 3 different sources
- Include metadata: source, report count estimate, first seen date

**Acceptance Criteria:**
- Script is reusable (can run weekly to update)
- All addresses validated before insertion
- Duplicate handling works correctly (merges report counts)
- Documentation on data sources and update frequency
- Test data separated from production data

---

## Phase 2: Anchor Program (Days 3-5)

### ANCHOR-001: Project Initialization
**Priority:** P0  
**Estimated Effort:** 2 hours  
**Dependencies:** INFRA-001

**Tasks:**
- Run `anchor init drainer_registry`
- Configure Anchor.toml for devnet and mainnet
- Set up program keypair (save securely)
- Configure wallet for deployment (fund with devnet SOL)
- Set up Anchor workspace in monorepo

**Acceptance Criteria:**
- Anchor project builds successfully
- Can deploy to local validator
- Program ID documented in environment variables
- Keypair securely stored (not in git)

---

### ANCHOR-002: DrainerReport Account Implementation
**Priority:** P0  
**Estimated Effort:** 4 hours  
**Dependencies:** ANCHOR-001

**Tasks:**
- Define DrainerReport struct with all required fields
- Implement account constraints (size, seeds)
- Add account discriminator
- Implement serialization/deserialization
- Write account initialization logic
- Write account update logic (increment counters)
- Add validation checks (non-zero report count, valid timestamps)

**Account Structure:**
```
DrainerReport {
    drainer_address: Pubkey,
    report_count: u32,
    first_reporter: Pubkey,
    first_report_timestamp: i64,
    last_report_timestamp: i64,
    evidence_hash: [u8; 32],
    total_fee_collected: u64
}
```

**Acceptance Criteria:**
- Account size is 132 bytes (matches calculation)
- PDA seeds match specification: ["drainer", drainer_address]
- Account can be created and updated
- Proper error handling for invalid inputs

---

### ANCHOR-003: report_drainer Instruction
**Priority:** P0  
**Estimated Effort:** 6 hours  
**Dependencies:** ANCHOR-002

**Tasks:**
- Implement instruction handler function
- Define instruction accounts with constraints
- Add input parameter validation (evidence_hash)
- Implement fee transfer logic (0.01 SOL)
- Handle account creation (if first report)
- Handle account update (if subsequent report)
- Add event emission for successful reports
- Write comprehensive error handling
- Add logging for debugging

**Validation Requirements:**
- drainer_address is not system program
- drainer_address is not native programs (Stake, Vote, etc.)
- evidence_hash is exactly 32 bytes
- reporter is signer
- fee >= 0.01 SOL

**Acceptance Criteria:**
- First report creates account successfully
- Subsequent reports increment counter correctly
- Fee is transferred appropriately
- Events are emitted with correct data
- All error conditions handled with clear messages
- Logging provides useful debugging information

---

### ANCHOR-004: Program Testing
**Priority:** P0  
**Estimated Effort:** 6 hours  
**Dependencies:** ANCHOR-003

**Tasks:**
- Write unit tests for account validation
- Write integration tests for report_drainer instruction
- Test first report scenario (account creation)
- Test subsequent report scenario (counter increment)
- Test error scenarios (invalid drainer, insufficient fee)
- Test concurrent reports to same address
- Test PDA derivation correctness
- Run tests on localnet
- Achieve >80% code coverage

**Test Scenarios:**
1. First report creates account with correct data
2. Second report increments counter
3. Fee validation rejects low fee
4. Invalid drainer address rejected
5. Evidence hash stored correctly
6. Timestamps are monotonic
7. Event emission works

**Acceptance Criteria:**
- All tests pass consistently
- No flaky tests
- Code coverage >80%
- Test output is clear and informative
- Tests run in <30 seconds

---

### ANCHOR-005: Devnet Deployment
**Priority:** P0  
**Estimated Effort:** 2 hours  
**Dependencies:** ANCHOR-004

**Tasks:**
- Build program with `anchor build`
- Verify program binary size (<200KB)
- Deploy to devnet with `anchor deploy`
- Verify deployment success
- Test basic operations on devnet
- Update environment variables with program ID
- Document program ID in README

**Acceptance Criteria:**
- Program deployed successfully to devnet
- Program ID documented
- Can create and query reports on devnet
- IDL published and accessible
- Deployment transaction confirmed

---

### ANCHOR-006: Client Library
**Priority:** P0  
**Estimated Effort:** 4 hours  
**Dependencies:** ANCHOR-005

**Tasks:**
- Generate TypeScript types from IDL
- Create client wrapper class for program interaction
- Implement method: derivePDA(drainerAddress)
- Implement method: fetchReport(drainerAddress)
- Implement method: submitReport(drainerAddress, evidenceHash, reporter)
- Add error handling and retry logic
- Write usage examples
- Document API in JSDoc

**Acceptance Criteria:**
- Client can query existing reports
- Client can submit new reports
- PDA derivation matches program
- Error messages are user-friendly
- Examples demonstrate all methods

---

## Phase 3: API Backend (Days 4-8)

### API-001: Hono Server Setup
**Priority:** P0  
**Estimated Effort:** 3 hours  
**Dependencies:** INFRA-002

**Tasks:**
- Initialize Hono application
- Set up middleware (CORS, logging, error handling)
- Configure environment variables
- Set up database connection pool
- Create health check endpoint
- Set up graceful shutdown handling
- Configure request timeout (30s)

**Acceptance Criteria:**
- Server starts on configured port
- Health check returns 200 OK
- CORS allows specified origins
- Logging captures all requests
- Graceful shutdown works (doesn't drop connections)

---

### API-002: Input Validation Middleware
**Priority:** P0  
**Estimated Effort:** 3 hours  
**Dependencies:** API-001

**Tasks:**
- Create wallet address validator (base58, 32-44 chars)
- Create file upload validator (size, MIME type)
- Create JSON schema validator for request bodies
- Add rate limiting middleware (per IP)
- Create error response formatter
- Add request sanitization

**Validation Rules:**
- Wallet addresses: base58, 32-44 characters, valid public key
- Evidence files: max 5MB, allowed types: image/*, application/pdf, text/plain
- Rate limit: 100 requests/hour per IP

**Acceptance Criteria:**
- Invalid addresses rejected with clear error
- Invalid files rejected before upload
- Rate limit enforced correctly
- Error responses follow consistent schema
- No possibility of SQL injection through inputs

---

### API-003: Helius RPC Integration
**Priority:** P0  
**Estimated Effort:** 6 hours  
**Dependencies:** API-001

**Tasks:**
- Create Solana connection with Helius endpoint
- Implement getSignaturesForAddress wrapper with error handling
- Implement getParsedTransactions wrapper with batching
- Add retry logic with exponential backoff
- Add response caching (5 minute TTL)
- Implement rate limit tracking
- Add fallback to public RPC if Helius fails
- Monitor and log RPC usage

**Error Handling:**
- Network timeouts: retry with backoff
- Rate limits: pause and retry
- Invalid responses: log and return partial data if possible

**Acceptance Criteria:**
- Can fetch transactions for any valid address
- Handles pagination correctly
- Retries transient failures
- Stays within rate limits
- Falls back gracefully on failures
- Caching reduces redundant calls

---

### API-004: Transaction Parser
**Priority:** P0  
**Estimated Effort:** 8 hours  
**Dependencies:** API-003

**Tasks:**
- Implement SPL token transfer extraction
- Implement native SOL transfer extraction
- Parse token metadata (mint, decimals, amount)
- Identify transfer direction (in/out relative to wallet)
- Extract program interactions (Token Program calls)
- Parse instruction types (Transfer, Approve, SetAuthority)
- Handle versioned transactions
- Handle inner instructions
- Normalize all data (amounts, timestamps, addresses)

**Data Extraction Requirements:**
- All outgoing token transfers
- All incoming token transfers
- Native SOL movements (excluding fees)
- Token approval instructions
- Delegate/SetAuthority instructions
- Transaction timestamps
- Sender and recipient addresses

**Acceptance Criteria:**
- Correctly identifies all transfers in test transactions
- Handles complex multi-instruction transactions
- Properly accounts for token decimals
- Distinguishes fees from transfers
- No data loss during normalization

---

### API-005: Detection Algorithms Implementation
**Priority:** P0  
**Estimated Effort:** 12 hours  
**Dependencies:** API-004, DATA-001

**Tasks:**
- Implement temporal clustering detection
- Implement sweeper bot detection
- Implement known drainer database lookup
- Implement on-chain registry query
- Implement risk factor aggregation
- Implement attack type classification
- Implement confidence scoring
- Add configurable thresholds via environment
- Optimize for performance (<15s total)

**Detection Methods:**
1. **Temporal Clustering:**
   - Scan for 3+ assets moved within 5 minutes
   - Exclude DEX interactions
   - Return HIGH severity risk factor

2. **Sweeper Bot:**
   - Find incoming + immediate outgoing pairs
   - Require 2+ repetitions
   - Return CRITICAL severity risk factor

3. **Known Drainer:**
   - Query database for recipient addresses
   - Weight by report count
   - Return CRITICAL severity risk factor

4. **On-Chain Registry:**
   - Query Anchor program for reports
   - Weight by on-chain report count
   - Return HIGH severity risk factor

**Acceptance Criteria:**
- All detection methods work independently
- Results combine correctly in aggregation
- Thresholds can be configured
- Performance meets <15s target on test data
- Confidence scores are reasonable

---

### API-006: Recovery Guidance Generator
**Priority:** P0  
**Estimated Effort:** 4 hours  
**Dependencies:** API-005

**Tasks:**
- Create recommendation templates for each attack type
- Implement conditional logic based on classification
- Add urgency levels to recommendations
- Include external resource links (Revoke.cash, etc.)
- Format recommendations for display
- Prioritize recommendations by urgency

**Templates Required:**
- seed_compromise (abandon wallet)
- permit_drainer (revoke approvals)
- approval_drain (revoke + move)
- malicious_extension (remove extension)
- unknown_drain (general security review)

**Acceptance Criteria:**
- Correct recommendations for each attack type
- Recommendations are actionable and clear
- Links work and point to correct resources
- Urgency levels are appropriate
- No contradictory advice

---

### API-007: Analysis Caching
**Priority:** P0  
**Estimated Effort:** 3 hours  
**Dependencies:** API-005, DATA-001

**Tasks:**
- Implement cache check before analysis
- Store analysis results in analysis_cache table
- Set TTL to 1 hour
- Implement cache invalidation on new reports
- Add cache warming for common addresses
- Monitor cache hit rate

**Caching Strategy:**
- Key: wallet address
- Value: full DrainAnalysis object (JSON)
- TTL: 1 hour
- Invalidate: on new on-chain report for drainer in analysis

**Acceptance Criteria:**
- Cached results returned in <200ms
- Cache misses trigger full analysis
- Expired cache entries cleaned up
- Cache hit rate >50% in testing
- No stale data returned (respect TTL)

---

### API-008: POST /api/check Endpoint
**Priority:** P0  
**Estimated Effort:** 4 hours  
**Dependencies:** API-002, API-007

**Tasks:**
- Implement route handler
- Validate input (wallet address)
- Check cache first
- Run analysis pipeline if cache miss
- Store result in cache
- Return DrainAnalysis response
- Add response time logging
- Handle errors gracefully

**Request Schema:**
```
{
  walletAddress: string
}
```

**Response Schema:**
```
{
  overallRisk: 'SAFE' | 'AT_RISK' | 'DRAINED',
  factors: RiskFactor[],
  attackType?: string,
  drainedAssets?: Asset[],
  recommendations: string[],
  checkedAt: string (ISO 8601)
}
```

**Acceptance Criteria:**
- Returns correct risk level for test addresses
- Response time <15s P95
- Cache hits return <1s
- Errors return appropriate status codes
- Response schema matches documentation

---

### API-009: GET /api/drainers/:address Endpoint
**Priority:** P1  
**Estimated Effort:** 2 hours  
**Dependencies:** API-001, DATA-001

**Tasks:**
- Implement route handler
- Validate address parameter
- Query database for drainer info
- Return drainer metadata
- Handle not found case (null)
- Add response caching (1 hour)

**Response Schema:**
```
{
  address: string,
  reportCount: number,
  firstReported: string,
  lastReported: string,
  source: string,
  onChainConfirmed: boolean
} | null
```

**Acceptance Criteria:**
- Returns data for known drainers
- Returns null for unknown addresses
- Response time <100ms
- Caching works correctly

---

### API-010: POST /api/report Endpoint
**Priority:** P1  
**Estimated Effort:** 6 hours  
**Dependencies:** API-001, ANCHOR-006

**Tasks:**
- Implement route handler
- Validate inputs (drainer address, evidence hash)
- Verify reporter wallet signature
- Build Anchor transaction
- Return serialized transaction for signing
- Implement confirmation webhook (POST /api/report/confirm)
- Update database on confirmation
- Handle errors and retry logic

**Request Schema:**
```
{
  drainerAddress: string,
  evidenceHash?: string,
  reporterPubkey: string,
  signature: string (wallet signature for auth)
}
```

**Response Schema:**
```
{
  transaction: string (base64 encoded)
}
```

**Acceptance Criteria:**
- Transaction builds correctly
- Wallet signature verified
- Transaction can be signed and submitted by frontend
- Confirmation updates database
- Errors handled gracefully

---

### API-011: POST /api/upload Endpoint
**Priority:** P1  
**Estimated Effort:** 4 hours  
**Dependencies:** API-002, INTEGRATION-001

**Tasks:**
- Implement multipart form handler
- Validate file (size, type)
- Compute SHA-256 hash
- Upload to Cloudflare R2
- Return hash and URL
- Handle upload failures
- Clean up temp files

**Request:** multipart/form-data with file field

**Response Schema:**
```
{
  hash: string (hex),
  url: string
}
```

**Acceptance Criteria:**
- Accepts files up to 5MB
- Rejects invalid file types
- Computes hash correctly
- Uploads to R2 successfully
- Returns accessible URL
- Cleans up on failure

---

### API-012: Solana Actions (Blinks) Implementation
**Priority:** P1  
**Estimated Effort:** 8 hours  
**Dependencies:** API-008

**Tasks:**
- Implement GET /api/actions/check (metadata)
- Implement POST /api/actions/check (execute)
- Implement OPTIONS /api/actions/* (CORS)
- Return Actions JSON spec
- Handle wallet address parameter from action
- Return analysis result in action response
- Add Open Graph meta tags for card rendering
- Test rendering in Twitter/Discord

**Actions JSON Structure:**
```
{
  icon: string (URL),
  title: string,
  description: string,
  label: string,
  links: {
    actions: [{
      label: string,
      href: string,
      parameters: [...]
    }]
  }
}
```

**Acceptance Criteria:**
- GET returns valid Actions JSON
- POST executes analysis correctly
- CORS allows social platform domains
- Blinks render in Twitter
- Results display correctly in action card
- Error states handled gracefully

---

## Phase 4: Frontend (Days 6-10)

### FRONTEND-001: Astro Project Setup
**Priority:** P0  
**Estimated Effort:** 3 hours  
**Dependencies:** INFRA-001

**Tasks:**
- Initialize Astro project with Svelte integration
- Configure Tailwind CSS
- Set up project structure (layouts, pages, components)
- Add TypeScript support
- Configure Astro for SSR where needed
- Set up environment variables
- Add dev server proxy to API

**Project Structure:**
```
src/
  layouts/
    BaseLayout.astro
  pages/
    index.astro (landing)
    check.astro (results)
    report.astro
    learn/
      index.astro
      [...slug].astro
    about.astro
  components/
    WalletInput.svelte
    ResultCard.svelte
    ReportForm.svelte
    etc.
  lib/
    api.ts (API client)
    types.ts
```

**Acceptance Criteria:**
- Dev server runs on localhost:4321
- Hot reload works for changes
- Tailwind styling works
- Svelte islands hydrate correctly
- API proxy works in dev mode

---

### FRONTEND-002: Design System
**Priority:** P1  
**Estimated Effort:** 4 hours  
**Dependencies:** FRONTEND-001

**Tasks:**
- Define color palette (safe=green, at-risk=yellow, drained=red)
- Create typography scale
- Design button components
- Design input components
- Design card components
- Create loading states
- Design error states
- Document in Storybook or README

**Color Palette:**
- Primary: Blue (call-to-action)
- Safe: Green (#10B981)
- At Risk: Yellow (#F59E0B)
- Drained: Red (#EF4444)
- Neutral: Grays for text/backgrounds

**Acceptance Criteria:**
- Consistent styling across all pages
- Accessible color contrast (WCAG AA)
- Reusable component library
- Responsive on mobile and desktop
- Documentation of design tokens

---

### FRONTEND-003: Landing Page
**Priority:** P0  
**Estimated Effort:** 6 hours  
**Dependencies:** FRONTEND-002

**Tasks:**
- Create hero section with value proposition
- Build wallet input component (Svelte island)
- Add example addresses (clickable)
- Create educational section (why use this tool)
- Add trust signals (open source, no key storage)
- Implement search functionality
- Add loading state during analysis
- Optimize for Core Web Vitals (<2.5s LCP)

**Key Elements:**
- Large input field for wallet address
- "Check Now" CTA button
- "Try: [example address]" links
- Stats: "X wallets checked, Y drainers identified"
- Footer with links (about, privacy, GitHub)

**Acceptance Criteria:**
- Input validates wallet addresses
- Submit triggers analysis
- Loading state shows progress
- Page loads in <2.5s
- Mobile responsive
- No CLS (cumulative layout shift)

---

### FRONTEND-004: Results Page
**Priority:** P0  
**Estimated Effort:** 8 hours  
**Dependencies:** FRONTEND-003

**Tasks:**
- Create risk level card (SAFE/AT_RISK/DRAINED)
- Display risk factors with evidence
- Show drained assets (if applicable)
- Display attack type classification
- Show recovery recommendations
- Add transaction evidence links
- Implement "Share Results" functionality
- Add "Check Another Wallet" button
- Create "Report This Drainer" link

**Layout:**
```
┌─────────────────────────────────┐
│  🚨 DRAINED                     │
│  Your wallet was compromised    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Attack Type: Permit Drainer    │
│  Date: Dec 1, 2024              │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Assets Lost:                   │
│  • 2.5 SOL (~$250)              │
│  • 150 USDC                     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  What To Do Now:                │
│  1. [Action]                    │
│  2. [Action]                    │
└─────────────────────────────────┘
```

**Acceptance Criteria:**
- Correct risk level displayed for test addresses
- All data from API rendered correctly
- Evidence links work (open in new tab)
- Share functionality works
- Mobile responsive
- No layout shift during data load

---

### FRONTEND-005: Report Drainer Form
**Priority:** P1  
**Estimated Effort:** 6 hours  
**Dependencies:** FRONTEND-002, API-010

**Tasks:**
- Create form component (Svelte)
- Add drainer address input (pre-filled if from results page)
- Add evidence file upload
- Add optional description field
- Integrate wallet connection (Phantom/Solflare)
- Display fee requirement (0.01 SOL)
- Handle transaction signing
- Show success/failure states
- Add transaction confirmation tracking

**Form Fields:**
- Drainer Address (required, pre-filled if applicable)
- Evidence File (optional, max 5MB)
- Description (optional, 1000 char max)

**Workflow:**
1. User fills form
2. Connects wallet
3. Evidence uploaded to R2 (if provided)
4. Transaction built by API
5. User signs in wallet
6. Transaction submitted to Solana
7. Confirmation tracked
8. Success message shown

**Acceptance Criteria:**
- Form validation works
- File upload works correctly
- Wallet connection works (multiple wallet types)
- Transaction signing flow smooth
- Success state shows transaction link
- Error states are clear and actionable

---

### FRONTEND-006: Educational Content Pages
**Priority:** P1  
**Estimated Effort:** 8 hours  
**Dependencies:** FRONTEND-002

**Tasks:**
- Create education hub page (/learn)
- Write content for each attack type:
  - Permit drainers
  - setOwner exploits
  - Seed phrase compromise
  - Malicious extensions
- Write protection guides:
  - How to revoke approvals
  - Safe signing practices
  - Recovery steps
- Create 2024 stats page (visual charts)
- Add internal linking between articles
- Optimize for SEO (meta tags, structured data)

**Content Requirements:**
- Each article 500-1000 words
- Clear explanations for non-technical users
- Real examples (screenshots, transaction links)
- Actionable advice
- Links to external resources

**Acceptance Criteria:**
- All articles written and published
- Content is accurate and helpful
- No grammar/spelling errors
- Internal navigation works
- Pages load quickly (<2s)
- SEO meta tags present

---

### FRONTEND-007: Share Functionality
**Priority:** P2  
**Estimated Effort:** 4 hours  
**Dependencies:** FRONTEND-004

**Tasks:**
- Create share modal component
- Add Twitter share button (pre-filled text)
- Add "Copy Link" button
- Add "Copy Blink" button (action URL)
- Generate share text based on result
- Add Open Graph meta tags for link previews
- Test rendering in Twitter/Discord

**Share Text Templates:**
- Safe: "I just checked my Solana wallet on @haveIBeenDrained ✅ SAFE - No suspicious activity! Check yours: [link]"
- Drained: "I discovered my wallet was drained using @haveIBeenDrained. Check if you're affected: [link]"

**Acceptance Criteria:**
- Share buttons work correctly
- Twitter opens with pre-filled text
- Copy actions work and show confirmation
- Blink URL format is correct
- Link previews render nicely

---

### FRONTEND-008: Mobile Responsiveness
**Priority:** P1  
**Estimated Effort:** 6 hours  
**Dependencies:** FRONTEND-003, FRONTEND-004

**Tasks:**
- Test all pages on mobile devices
- Fix layout issues on small screens
- Optimize touch targets (min 44x44px)
- Test wallet connections on mobile
- Optimize images for mobile
- Test in mobile browsers (Safari, Chrome)
- Fix any mobile-specific bugs

**Breakpoints:**
- Mobile: <640px
- Tablet: 640-1024px
- Desktop: >1024px

**Acceptance Criteria:**
- All pages usable on mobile
- Touch targets are accessible
- No horizontal scrolling
- Forms work on mobile keyboards
- Wallet connection works in mobile wallets
- Performance remains good on mobile

---

## Phase 5: Integration & Testing (Days 9-11)

### INTEGRATION-001: Cloudflare R2 Setup
**Priority:** P1  
**Estimated Effort:** 3 hours  
**Dependencies:** None

**Tasks:**
- Create R2 bucket
- Configure CORS settings
- Set up access keys
- Create folder structure (evidence/)
- Configure lifecycle rules (no deletion)
- Test upload from API
- Verify public access works

**Acceptance Criteria:**
- Bucket created and accessible
- Can upload files via API
- Uploaded files are publicly accessible
- CORS configured for API domain
- Access keys stored securely

---

### INTEGRATION-002: Helius Account Setup
**Priority:** P0  
**Estimated Effort:** 1 hour  
**Dependencies:** None

**Tasks:**
- Sign up for Helius account
- Create API key
- Configure rate limits
- Add API key to environment variables
- Test connection from API
- Monitor usage dashboard

**Acceptance Criteria:**
- Account created and verified
- API key works
- Usage tracking visible
- Rate limits understood
- Alert set up for 80% quota usage

---

### TEST-001: Unit Testing
**Priority:** P1  
**Estimated Effort:** 8 hours  
**Dependencies:** API-005, API-006

**Tasks:**
- Write tests for detection algorithms
- Write tests for risk aggregation
- Write tests for classification logic
- Write tests for recommendation generator
- Write tests for input validators
- Achieve >80% code coverage
- Set up continuous testing in CI

**Testing Framework:** Vitest or Jest

**Test Categories:**
- Detection algorithms with known test cases
- Edge cases (empty wallet, single transaction)
- Error handling (RPC failures, invalid data)
- Caching behavior
- Database queries

**Acceptance Criteria:**
- All tests pass
- Code coverage >80%
- Tests run in <2 minutes
- No flaky tests
- CI runs tests on every commit

---

### TEST-002: Integration Testing
**Priority:** P1  
**Estimated Effort:** 6 hours  
**Dependencies:** API-008, API-010, FRONTEND-004

**Tasks:**
- Test end-to-end wallet check flow
- Test report submission flow
- Test cache behavior
- Test error scenarios (RPC timeout, invalid address)
- Test with real wallet addresses (devnet)
- Performance test with various wallet sizes
- Load test with concurrent requests

**Test Scenarios:**
1. Check known safe wallet → returns SAFE
2. Check known drained wallet → returns DRAINED
3. Submit report → updates database and on