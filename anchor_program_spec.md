# Anchor Program Specification - Drainer Registry

## Program Overview

**Program Name:** Drainer Registry  
**Purpose:** On-chain storage and verification of community-reported malicious wallet addresses  
**Network:** Solana (Devnet for testing, Mainnet for production)  
**Framework:** Anchor v0.30.x+

---

## 1. Program Architecture

### 1.1 Core Concept

The Drainer Registry is a decentralized database of reported malicious addresses. It allows any Solana wallet holder to submit reports about suspected drainer addresses with optional evidence. Reports are immutable once created and can only be incremented (additional reports against same address).

**Key Design Principles:**
- Permissionless reporting (anyone can submit)
- Immutable records (cannot delete or modify, only increment)
- Anti-spam protection (small SOL fee per report)
- Evidence linking (hash stored on-chain, file stored off-chain)
- Queryable by address (derive PDA deterministically)

### 1.2 Account Structure

**Program Accounts:**

1. **DrainerReport** (PDA Account)
   - Seeds: `["drainer", drainer_address.key()]`
   - Stores aggregated report data for a specific drainer address
   - Created on first report, updated on subsequent reports
   - Fixed size to ensure rent exemption calculation is consistent

2. **Program Authority** (Optional, Future)
   - Seeds: `["authority"]`
   - Could store program configuration (minimum report fee, etc.)
   - Not required for MVP but consider in design

### 1.3 State Management

**Account Lifecycle:**
- Created: First report against an address creates PDA account
- Updated: Subsequent reports increment counter and update metadata
- Closed: Never (reports are permanent)

**Data Consistency:**
- All writes are atomic (either full report or nothing)
- No partial state updates
- Report count increments are safe from race conditions (Solana's single-threaded execution per account)

---

## 2. Account Schemas

### 2.1 DrainerReport Account

**Purpose:** Store aggregated data about a reported drainer address

**Fields:**

| Field Name | Type | Size | Description |
|------------|------|------|-------------|
| `drainer_address` | `Pubkey` | 32 bytes | The address being reported as malicious |
| `report_count` | `u32` | 4 bytes | Number of times this address has been reported |
| `first_reporter` | `Pubkey` | 32 bytes | Address of first reporter (for attribution) |
| `first_report_timestamp` | `i64` | 8 bytes | Unix timestamp of first report |
| `last_report_timestamp` | `i64` | 8 bytes | Unix timestamp of most recent report |
| `evidence_hash` | `[u8; 32]` | 32 bytes | SHA-256 hash of first evidence file (if provided) |
| `total_fee_collected` | `u64` | 8 bytes | Sum of all anti-spam fees collected |

**Total Account Size:** 8 (discriminator) + 32 + 4 + 32 + 8 + 8 + 32 + 8 = 132 bytes

**Rent Exemption Calculation:**
- Account size: 132 bytes
- Rent-exempt minimum: ~0.0014 SOL (at current rates)
- Add buffer for future size increases: target 0.002 SOL

**PDA Derivation:**
- Seeds: `[b"drainer", drainer_address.as_ref()]`
- Bump: Found programmatically, not stored

**Constraints:**
- `drainer_address` must not be system program or native programs
- `report_count` starts at 1 (first report) and increments
- Timestamps must be monotonically increasing
- `evidence_hash` can be all zeros if no evidence provided

### 2.2 Future Account Extensions

**ReporterProfile** (Post-Hackathon)
- Track reporter reputation
- Store reporter's report history
- Could enable weighted voting or rewards

**Configuration** (Post-Hackathon)
- Program-level settings
- Minimum fee amount
- Admin controls for emergency pause

---

## 3. Instructions

### 3.1 Instruction: `report_drainer`

**Purpose:** Create new report or increment existing report for a drainer address

**Accounts Required:**

| Account Name | Mutability | Signer | Description |
|--------------|------------|--------|-------------|
| `report` | Mutable | No | PDA account for drainer report |
| `drainer_address` | Immutable | No | The address being reported |
| `reporter` | Mutable | Yes | Wallet submitting the report |
| `system_program` | Immutable | No | System program for account creation |

**Arguments:**

| Argument Name | Type | Description |
|---------------|------|-------------|
| `evidence_hash` | `[u8; 32]` | SHA-256 hash of evidence file (or zeros if none) |

**Processing Logic:**

1. **Validation Phase:**
   - Verify `drainer_address` is not a system/native program
   - Verify `reporter` is a valid signer
   - Verify `evidence_hash` is exactly 32 bytes
   - Verify minimum anti-spam fee is paid (0.01 SOL)

2. **Account Creation or Update:**
   - Derive PDA for `report` account
   - Check if account exists:
     - **If not exists:** Create account with initial data
     - **If exists:** Load existing data and increment counters

3. **Data Population (New Report):**
   - Set `drainer_address` from account key
   - Set `report_count` to 1
   - Set `first_reporter` to `reporter` pubkey
   - Set `first_report_timestamp` to current timestamp
   - Set `last_report_timestamp` to current timestamp
   - Set `evidence_hash` from argument
   - Set `total_fee_collected` to anti-spam fee amount

4. **Data Update (Existing Report):**
   - Increment `report_count` by 1
   - Update `last_report_timestamp` to current timestamp
   - Add anti-spam fee to `total_fee_collected`
   - Do NOT update `first_reporter` or `first_report_timestamp`
   - Do NOT update `evidence_hash` (preserve first evidence)

5. **Fee Transfer:**
   - Transfer 0.01 SOL from `reporter` to `report` PDA (stored as rent)
   - Alternatively: Transfer to protocol treasury (if implementing)

**Error Conditions:**

| Error Code | Condition | User Message |
|------------|-----------|--------------|
| `InvalidDrainerAddress` | Drainer is system program | "Cannot report system addresses" |
| `InsufficientFee` | Fee < 0.01 SOL | "Minimum 0.01 SOL required to report" |
| `InvalidEvidenceHash` | Hash is not 32 bytes | "Evidence hash must be 32 bytes" |
| `TimestampError` | Clock unavailable | "Unable to get timestamp" |

**Return Value:** None (transaction success indicates completion)

**Events Emitted:**
- `DrainerReported` event with: drainer_address, reporter, report_count, timestamp

### 3.2 Instruction: `close_report` (Future, Not MVP)

**Purpose:** Allow first reporter to close their report (e.g., if false positive)

**Rationale for Exclusion from MVP:**
- Adds complexity without clear benefit for hackathon demo
- Could enable abuse (drainers closing their own reports)
- Better to implement dispute resolution system post-launch
- Reports should be permanent for audit trail

**Future Considerations:**
- Require supermajority consensus to close
- Implement appeal period
- Preserve closed reports in archived state

---

## 4. Program Security

### 4.1 Access Control

**Who Can Call `report_drainer`:**
- Any Solana wallet with sufficient SOL balance
- No whitelist or permission system
- Anti-spam fee prevents unlimited spam

**Who Cannot Call `report_drainer`:**
- Accounts without signer (prevents unauthorized reports)
- Accounts without minimum fee (prevents spam)

**Account Modification Rules:**
- Only the program can modify `DrainerReport` accounts
- Reporter cannot directly edit after submission
- Report PDA is owned by program, not reporter

### 4.2 Attack Vectors & Mitigations

**Attack: Spam Reporting**
- **Vector:** Attacker submits thousands of false reports
- **Mitigation:** 0.01 SOL fee per report makes it expensive
- **Additional:** Could implement reputation system post-launch

**Attack: Self-Reporting to Dilute Signal**
- **Vector:** Drainer reports themselves to make reports less meaningful
- **Mitigation:** Report count still increases (transparent on-chain)
- **Additional:** Client-side filtering by reporter reputation

**Attack: Griefing Innocent Addresses**
- **Vector:** Attacker reports legitimate addresses maliciously
- **Mitigation:** First reporter is recorded (accountability)
- **Additional:** Off-chain evidence requirement for high-confidence

**Attack: PDA Collision**
- **Vector:** Two different drainer addresses derive same PDA
- **Mitigation:** Solana PDA derivation is cryptographically secure
- **Risk Level:** Negligible (256-bit address space)

**Attack: Rent Exhaustion**
- **Vector:** Creating many accounts to drain rent reserves
- **Mitigation:** Rent is paid by reporter, not program
- **Risk Level:** Low (affects reporter, not program)

### 4.3 Economic Security

**Fee Structure:**
- Minimum: 0.01 SOL per report
- Goes to: Report PDA account (stays as rent)
- Rationale: Makes spam expensive while keeping reporting accessible

**Rent Economics:**
- Account rent: ~0.002 SOL (exempt amount)
- Fee per report: 0.01 SOL
- Net accumulation: 0.008 SOL per report to PDA
- Use case: Could fund future bounties or refunds

**Cost-Benefit Analysis:**
- Attacker cost to create 1000 false reports: 10 SOL (~$1000)
- Community benefit: Transparent on-chain record
- Legitimate reporter cost: $1 per report (reasonable)

---

## 5. Client Integration

### 5.1 TypeScript Client Interface

**Required Libraries:**
- `@coral-xyz/anchor` for program interaction
- `@solana/web3.js` for general Solana operations
- Program IDL (generated from Anchor build)

**Connection Setup:**
- Initialize Anchor Provider with RPC endpoint
- Load program using program ID and IDL
- Configure commitment level (recommend 'confirmed' for reads, 'finalized' for writes)

**Key Operations:**

1. **Query Existing Report:**
   - Derive PDA for drainer address
   - Fetch account data
   - Deserialize into `DrainerReport` struct
   - Handle case where account doesn't exist (no reports yet)

2. **Submit New Report:**
   - Build instruction with proper accounts
   - Sign with reporter wallet
   - Submit transaction
   - Confirm transaction
   - Sync to off-chain database

3. **Monitor Events:**
   - Subscribe to program logs
   - Parse `DrainerReported` events
   - Update off-chain database in real-time

### 5.2 PDA Derivation

**Deterministic Derivation:**
- Seeds must match on-chain program exactly
- Order matters: `["drainer", drainer_pubkey]`
- Use `PublicKey.findProgramAddressSync()` for deterministic bump
- Cache derived PDAs to avoid redundant computation

**Error Handling:**
- PDA derivation can fail if seeds are invalid
- Validate drainer address before derivation
- Handle cases where account doesn't exist (return null, not error)

### 5.3 Transaction Building

**Account Ordering:**
- Must match program's instruction definition exactly
- Use Anchor's methods builder for type safety
- Verify account ordering in transaction simulation

**Fee Handling:**
- Add 0.01 SOL to reporter balance check before submission
- Consider adding extra for transaction fees (~0.000005 SOL)
- Show total cost to user before signing

**Transaction Confirmation:**
- Use 'confirmed' commitment for user feedback (faster)
- Use 'finalized' commitment before updating database (safer)
- Implement timeout (30 seconds) to handle network issues
- Retry logic for temporary failures

### 5.4 Error Handling

**Transaction Failures:**
- Parse program error codes from transaction logs
- Map error codes to user-friendly messages
- Distinguish between user errors and system errors
- Implement retry logic for transient failures

**Account Deserialization:**
- Handle missing accounts gracefully (no reports yet)
- Validate deserialized data format
- Handle deprecated account formats (if schema evolves)

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Program Logic Tests:**
- Test account creation on first report
- Test counter increment on subsequent reports
- Test fee validation logic
- Test PDA derivation correctness
- Test timestamp handling

**Test Data:**
- Use deterministic keypairs for reproducibility
- Test with various drainer addresses
- Test with and without evidence hashes
- Test edge cases (zero balance, max counters)

### 6.2 Integration Tests

**On Localnet:**
- Deploy program to local validator
- Test full report submission flow
- Test querying reports
- Test multiple reports to same address
- Test error conditions

**On Devnet:**
- Deploy to devnet for realistic testing
- Test with real wallet (Phantom/Solflare)
- Test transaction confirmation times
- Test RPC reliability
- Test concurrent report submissions

### 6.3 Validation Criteria

**Functional Correctness:**
- Report creation succeeds with valid inputs
- Report updates increment counters correctly
- PDA derivation is deterministic
- Fees are transferred correctly
- Events are emitted correctly

**Security:**
- Unauthorized signers rejected
- Invalid addresses rejected
- Insufficient fees rejected
- No unexpected state changes

**Performance:**
- Transaction confirmation <5s P95
- Account queries <1s
- PDA derivation <100ms

---

## 7. Deployment Process

### 7.1 Pre-Deployment

**Code Preparation:**
- Audit all instructions for security issues
- Test thoroughly on localnet
- Test on devnet with real transactions
- Review all anchor constraints
- Verify account sizes and rent calculations

**Build Process:**
- Run `anchor build`
- Verify program binary size (<200KB recommended)
- Generate IDL file
- Verify IDL matches program interface

**Wallet Setup:**
- Create deployer wallet with sufficient SOL
- Devnet: Get SOL from faucet (unlimited)
- Mainnet: Fund with ~5 SOL (2 for deployment, 3 buffer)

### 7.2 Deployment Steps

**Devnet Deployment:**
1. Set cluster to devnet in Anchor.toml
2. Run `anchor deploy --provider.cluster devnet`
3. Note program ID from output
4. Verify deployment with `solana program show <PROGRAM_ID>`
5. Test basic operations (submit report, query)

**Mainnet Deployment:**
1. Set cluster to mainnet in Anchor.toml
2. Run `anchor deploy --provider.cluster mainnet`
3. Note program ID from output
4. Immediately test with small transaction
5. Mark program as immutable (prevents future updates)

**Post-Deployment:**
- Update client code with program ID
- Update environment variables
- Deploy IDL to client application
- Test end-to-end flow
- Monitor for errors in logs

### 7.3 Program Upgrades (Post-Hackathon)

**Upgrade Strategy:**
- Programs are upgradeable by default unless marked immutable
- For hackathon: Mark immutable after deployment (demonstrates commitment)
- For production: Keep upgradeable with multisig authority

**Version Management:**
- Include version number in program
- Document breaking changes in upgrade
- Provide migration path for clients
- Test upgrade on devnet first

---

## 8. Monitoring & Maintenance

### 8.1 On-Chain Monitoring

**Transaction Monitoring:**
- Track all program transactions
- Alert on failed transactions
- Monitor transaction volume trends
- Track unique reporters

**Account Monitoring:**
- Count total DrainerReport accounts created
- Monitor account rent balances
- Track total fees collected
- Alert on unusual account creation patterns

**Performance Monitoring:**
- Transaction confirmation times
- Program compute unit usage
- Account query latency

### 8.2 Health Checks

**Program Health:**
- Verify program account exists
- Verify program is executable
- Verify program data is not corrupted
- Test basic instruction execution

**Data Integrity:**
- Spot-check DrainerReport accounts
- Verify report counts make sense
- Check for orphaned accounts
- Validate timestamp ordering

### 8.3 Incident Response

**Transaction Failures:**
- Investigate error codes in logs
- Check if program account is healthy
- Verify RPC endpoint connectivity
- Contact Solana status for network issues

**Data Inconsistencies:**
- Compare on-chain state to off-chain database
- Reconcile differences
- Identify root cause (sync lag, bug, etc.)
- Fix data and prevent recurrence

---

## 9. Program Limitations & Future Work

### 9.1 Known Limitations

**Immutability:**
- Reports cannot be deleted or modified
- False positives remain on-chain forever
- Solution: Implement dispute resolution system

**No Access Control:**
- Anyone can report any address
- No reputation system
- Solution: Add reporter scoring post-launch

**Fixed Account Size:**
- Cannot store multiple evidence hashes
- Cannot add new fields without migration
- Solution: Design for extensibility from start

**No Cross-Program Composability:**
- Other programs cannot easily integrate
- No CPI support for verification
- Solution: Consider CPI interface in v2

### 9.2 Future Enhancements

**Reputation System:**
- Track reporter accuracy
- Weight reports by reporter reputation
- Reward good reporters with tokens

**Dispute Resolution:**
- Allow appeals for false positives
- Require multiple reports before "confirmed"
- Implement council voting for edge cases

**Evidence Storage:**
- Store multiple evidence hashes
- Link to IPFS or Arweave
- Enable on-chain verification

**Cross-Chain Support:**
- Report EVM addresses
- Bridge reports to other chains
- Unified threat intelligence

---

## 10. Reference Documentation

### 10.1 Useful Resources

**Anchor Documentation:**
- Anchor Book: https://www.anchor-lang.com/
- PDAs: https://www.anchor-lang.com/docs/pdas
- Error Handling: https://www.anchor-lang.com/docs/errors

**Solana Documentation:**
- Program Deployment: https://docs.solana.com/cli/deploy-a-program
- Rent Calculation: https://docs.solana.com/developing/programming-model/accounts#rent
- Transaction Lifecycle: https://docs.solana.com/developing/programming-model/transactions

**Security Best Practices:**
- Neodyme Security Guide: https://github.com/coral-xyz/sealevel-attacks
- Solana Security Best Practices: https://github.com/0xsanny/solsec

### 10.2 Example Queries

**Query All Reports for Address:**
```
Filter: memcmp at offset 8 (drainer_address field)
Result: Single DrainerReport account or null
```

**Get Report Count:**
```
Fetch account, read report_count field
```

**List All Reported Drainers:**
```
GetProgramAccounts with filter:
- Account size = 132 bytes
- Parse all DrainerReport accounts
Note: Expensive operation, prefer off-chain indexing
```

---

## Document Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 5, 2025 | Initial Anchor program specification |