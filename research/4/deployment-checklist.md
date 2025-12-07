# Anchor Framework: Deployment Checklist & Security Audit Guide
## For "Have I Been Drained" Solana Program

---

## Pre-Deployment Security Checklist

### ✅ PHASE 1: Code Review & Static Analysis (Days 1-2)

**A. Constraint Validation**
- [ ] Every mutable account has `#[account(mut)]`
- [ ] Every account read validates ownership with `#[account(owner = ...)]`
- [ ] All PDAs use canonical bump: `#[account(seeds = [...], bump)]`
- [ ] No use of `init_if_needed` (risk of reinitialization)
- [ ] Authority checks use `Signer<'info>` type (not manual validation)
- [ ] All token accounts validated with `token::mint` and `token::authority`
- [ ] `remaining_accounts` validated inside handler (not auto-validated)

**B. Memory & Size Calculation**
- [ ] All account structs use `#[derive(InitSpace)]`
- [ ] Manual size calculations verified: `8 + struct_bytes`
- [ ] No oversized accounts (test rent calculation)
- [ ] Dynamic arrays converted to fixed-size alternatives
- [ ] Vector/String/Option usages compile without errors

**C. Access Control**
- [ ] Admin/authority stored and validated before use
- [ ] No hardcoded addresses (all dynamic)
- [ ] Permission checks before sensitive operations
- [ ] Authority transfer not possible without explicit new instruction
- [ ] No missing signer checks on state-changing operations

**D. Error Handling**
- [ ] No `unwrap()` or `.expect()` in instruction handlers
- [ ] All Results properly propagated with `?`
- [ ] Custom error messages descriptive (for debugging)
- [ ] Error types properly defined in `#[error_code]`
- [ ] Division by zero prevented with checks

**E. Code Quality**
- [ ] `cargo clippy` passes (no warnings)
- [ ] No unsafe code (unless documented)
- [ ] Variable naming consistent and clear
- [ ] Dead code removed
- [ ] Magic numbers defined as constants
- [ ] Comments explain non-obvious logic

**Run Checks:**
```bash
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --check
cargo audit  # Check dependencies for known CVEs
```

---

### ✅ PHASE 2: Unit Testing (Days 2-3)

**Instructions Coverage**
- [ ] Initialize/setup instructions pass with valid inputs
- [ ] All error cases tested with invalid inputs
- [ ] Boundary conditions tested (zero, max, min values)
- [ ] Signer requirements enforced
- [ ] Account ownership validated
- [ ] PDA derivation verified

**Account State Testing**
- [ ] Account data correctly initialized
- [ ] Discriminators set properly
- [ ] Rent exemption met
- [ ] Subsequent instructions read correct state
- [ ] State transitions valid

**Constraint Testing**
- [ ] Missing `mut` causes failure
- [ ] Wrong account owner rejected
- [ ] Non-canonical bump rejected
- [ ] Signer-required accounts unsigned rejected
- [ ] Space constraints enforced

**Example Test Structure:**
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::solana_program::pubkey::Pubkey;

    #[test]
    fn test_register_drainer_valid() {
        // Setup
        let mut drainer_info = DrainerInfo {
            address: Pubkey::new_unique(),
            detection_count: 0,
            total_victims: 0,
            last_seen_slot: 0,
            confidence_score: 0,
            bump: 255,
        };
        
        // Action & Assert
        assert_eq!(drainer_info.address != Pubkey::default(), true);
    }
    
    #[test]
    #[should_panic]
    fn test_register_drainer_invalid_default_pubkey() {
        let _drainer = Pubkey::default();
        // Constraint should catch this in instruction handler
    }
}
```

---

### ✅ PHASE 3: Integration Testing with Bankrun (Days 3-4)

**Test Environment Setup**
- [ ] Bankrun configured with correct program ID
- [ ] BanksClient instantiated correctly
- [ ] Provider/Program objects created
- [ ] Payer has sufficient lamports

**Transaction Testing**
- [ ] Valid transactions succeed
- [ ] Invalid transactions fail with expected errors
- [ ] Account state changes persisted
- [ ] Events emitted correctly
- [ ] Compute unit usage acceptable (<10k CU per instruction)

**Account Lifecycle**
- [ ] Account creation with correct size
- [ ] Account closure returns rent lamports
- [ ] Realloc operations succeed with proper payer
- [ ] Account data survives reload

**Time & Slot Testing**
- [ ] Clock.get() returns expected values
- [ ] Slot-based logic works correctly
- [ ] Time travel (warpToSlot) succeeds
- [ ] Block time progression correct

**Multi-Account Testing**
- [ ] Instructions with multiple accounts process correctly
- [ ] PDA ordering doesn't cause failures
- [ ] Signature verification works across accounts
- [ ] Account modification visible to next instruction

---

### ✅ PHASE 4: Deployment Planning (Days 4-5)

**Devnet Deployment**
- [ ] Program builds without warnings: `cargo build-sbf --release`
- [ ] Program size acceptable (<1 MB typical)
- [ ] Rent cost calculated: `solana rent <bytes>`
- [ ] Devnet wallet funded: `solana airdrop 5 -u devnet`
- [ ] Program deployed successfully: `solana program deploy ...`
- [ ] All instructions work on devnet
- [ ] Program fully tested before mainnet

**Upgrade Authority Management**
- [ ] Upgrade authority keypair stored securely
- [ ] Backup copy created (encrypted)
- [ ] Mainnet uses different keypair than devnet
- [ ] Plan for transferring to multisig (if team)
- [ ] Document process for program updates

**Mainnet Preparation**
- [ ] Mainnet wallet created separately (never mixed with devnet)
- [ ] Sufficient SOL acquired (3.5 SOL + buffer)
- [ ] Program ID finalized (declare_id! won't change)
- [ ] Deployment instruction written and reviewed
- [ ] 2 people verify deployment before execution
- [ ] Rollback plan documented (can redeploy if critical bug)

---

### ✅ PHASE 5: Security Audit (Days 5-6)

**Manual Code Review Checklist**

For each instruction handler:
- [ ] Read function signature and constraints
- [ ] Verify all accounts are validated
- [ ] Check signer requirements
- [ ] Confirm state changes logged with emit!
- [ ] Ensure no state assumptions without validation
- [ ] Verify arithmetic won't overflow/underflow
- [ ] Check if CPI calls are used and if validated
- [ ] Confirm error cases properly handled

**Common Vulnerability Scan**

Using Sealevel Attacks repository as reference:
- [ ] **No account confusion** - Each account type distinguishable
- [ ] **No authority bypass** - Can't spoof admin/owner
- [ ] **No reinitialization** - init constraint prevents retry
- [ ] **No data staleness** - reload() used after external changes
- [ ] **No reentrancy** - CPI calls don't modify caller state
- [ ] **No missing validations** - All inputs checked
- [ ] **No arithmetic issues** - Overflow/underflow prevented
- [ ] **No unvalidated CPIs** - All returned values verified

**Run Automated Scanners:**

```bash
# OtterSec verify (Recommended for Anchor)
git clone https://github.com/OtterSec/audit-tools
./verify.sh

# Cargo audit for dependencies
cargo audit

# Clippy for code quality
cargo clippy -- -D warnings
```

---

## Mainnet Deployment Process

### Step 1: Final Verification (30 minutes)

```bash
# 1. Verify program builds
cargo build-sbf --release
# Output should show: Program: target/deploy/have_i_been_drained.so

# 2. Check final size
ls -lh target/deploy/have_i_been_drained.so
# Example: 450K

# 3. Calculate rent requirement
solana rent 450000
# Example output: 3.45 SOL per year

# 4. Run all tests one more time
cargo test
anchor test

# 5. Verify correct program ID
grep -i "declare_id" programs/*/src/lib.rs
# Should match the keypair you'll use for deployment
```

### Step 2: Prepare Mainnet Wallet

```bash
# Create fresh mainnet keypair (separate from devnet!)
solana-keygen new --outfile /path/to/mainnet-keypair.json
solana-keygen pubkey /path/to/mainnet-keypair.json

# Fund this wallet with >4 SOL
# Use reliable exchange with withdrawal to the address above

# Verify balance
solana balance <address> -u mainnet-beta
# Example: 4.5 SOL
```

### Step 3: Execute Deployment

```bash
# Set network
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
solana config set --url mainnet-beta

# Create upgrade keypair
solana-keygen new --outfile /path/to/upgrade-authority.json

# Deploy with explicit authority
solana program deploy \
  --program-id /path/to/program-keypair.json \
  target/deploy/have_i_been_drained.so \
  -u mainnet-beta \
  -k /path/to/mainnet-keypair.json \
  --with-compute-unit-price 100

# Output example:
# Program Id: HaveIBeenDrained1111111111111111111111111111
# Signature: 5EZ...
# Confirming...
# Success
```

### Step 4: Verify Deployment

```bash
# Check program exists
solana program show HaveIBeenDrained111... -u mainnet-beta

# Output:
# Program Id: HaveIBeenDrained111...
# Owner: BPFLoaderUpgradeab1e111111111111111111111111111
# ProgramData Address: HaveIBeenDrained2222...
# Authority (upgrade): <upgrade-authority-pubkey>
# Executable: true

# Verify authority is correct
solana program show HaveIBeenDrained111... -u mainnet-beta | grep Authority

# Test from client
npm run test:mainnet  # Custom test against mainnet deployment
```

### Step 5: Security Hardening (Post-Deploy)

```bash
# Option A: Transfer to multisig (recommended for teams)
solana program set-upgrade-authority \
  HaveIBeenDrained111... \
  --new-upgrade-authority <multisig-address> \
  -u mainnet-beta \
  -k /path/to/upgrade-authority.json

# Option B: Make immutable (careful - can never upgrade!)
solana program set-upgrade-authority \
  HaveIBeenDrained111... \
  --final \
  -u mainnet-beta \
  -k /path/to/upgrade-authority.json

# Verify change
solana program show HaveIBeenDrained111... -u mainnet-beta
```

---

## Operational Runbooks

### Regular Maintenance

**Weekly:**
- [ ] Check program status with `solana program show`
- [ ] Monitor account sizes for growth
- [ ] Verify no unexpected account creations

**Monthly:**
- [ ] Review events for anomalies
- [ ] Check rent income vs. expenses
- [ ] Test upgrade procedure on devnet

**Quarterly:**
- [ ] Security audit of latest code
- [ ] Update dependencies: `cargo update`
- [ ] Review access logs

### Emergency Procedures

**Critical Bug Discovered:**

1. **Immediate** (0-30 minutes)
   - [ ] Create GitHub issue (private repo)
   - [ ] Gather core team
   - [ ] Assess impact (is deployed version vulnerable?)
   - [ ] If critical: Prepare hotfix

2. **Short-term** (30 min - 2 hours)
   - [ ] Write unit tests reproducing bug
   - [ ] Code review of proposed fix
   - [ ] Test on devnet thoroughly
   - [ ] Prepare deployment transaction

3. **Execution** (2-24 hours)
   - [ ] Get sign-off from team
   - [ ] Deploy to mainnet using standard procedure
   - [ ] Verify fix works
   - [ ] Post-mortem documenting incident

**Program Completely Broken:**
- [ ] Don't panic - Solana is immutable by default if set correctly
- [ ] Contact Solana Foundation in #incident-reports on Discord
- [ ] Communicate with users about the issue
- [ ] Prepare new program with fixes for redeploy

---

## Cost Breakdown (Updated December 2025)

### One-Time Costs

| Item | Cost | Notes |
|------|------|-------|
| Program Deployment | 3.45 SOL | 450 KB program |
| Professional Audit | $10k-50k | Optional, recommended |
| **Total One-Time** | **$13-68** | At $20/SOL |

### Monthly Operating Costs

| Item | Quantity | Unit Cost | Monthly Total |
|------|----------|-----------|----------------|
| Transaction Fees | 50,000 reports | $0.0001 | $5 |
| Account Storage | 10,000 drainers | $0.04/year | $33 |
| Account Storage | 100,000 victims | $0.08/year | $667 |
| **Monthly Total** | - | - | **~$705** |

### Break-even Analysis

To make the program self-sustaining:
- Fee per report: $0.02-0.05
- Expected reports/month: 10,000-50,000
- Required monthly revenue: $700-1000
- Implies: 14,000-50,000 reports at $0.05 fee

---

## Post-Deployment Monitoring

### Key Metrics to Track

```sql
-- Setup monitoring database
CREATE TABLE program_metrics (
    timestamp TIMESTAMP,
    total_drainers INT,
    total_victims INT,
    transactions_per_hour INT,
    average_tx_size INT,
    compute_units_used INT,
    errors_count INT,
    critical_errors INT
);

-- Setup alerts
CREATE ALERT critical_error_rate
  WHERE (critical_errors / total_transactions) > 0.01
  THEN notify_team();

CREATE ALERT account_size_growth
  WHERE account_growth_rate > 0.1  -- 10% per month
  THEN review_optimizations();
```

### Log Monitoring

- Monitor Solana network logs for program errors
- Set up alerts on Helius for high-error rates
- Track transaction signatures in database
- Monitor compute unit usage trends

---

## Checklist Summary Table

| Phase | Task | Owner | Deadline | Status |
|-------|------|-------|----------|--------|
| Code Review | Constraint validation | Dev | Day 1 | ☐ |
| Code Review | Memory/size check | Dev | Day 1 | ☐ |
| Code Review | Access control audit | Dev | Day 2 | ☐ |
| Unit Tests | Coverage >90% | QA | Day 2 | ☐ |
| Integration Tests | Bankrun tests pass | QA | Day 3 | ☐ |
| Integration Tests | Devnet deployment | DevOps | Day 4 | ☐ |
| Security | Static analysis | Security | Day 5 | ☐ |
| Security | Vulnerability scan | Security | Day 5 | ☐ |
| Deployment | Mainnet setup | DevOps | Day 5 | ☐ |
| Deployment | Final verification | Lead Dev | Day 6 | ☐ |
| Deployment | Execute mainnet | DevOps | Day 6 | ☐ |
| Verification | Test all features | QA | Day 6 | ☐ |

---

## Final Reminders

⚠️ **Critical Points:**
1. **Never** use the same keypair for devnet and mainnet
2. **Always** verify the program ID matches declare_id! before deployment
3. **Always** test on devnet first
4. **Never** leave upgrade authority as single keypair on mainnet (transfer to multisig)
5. **Always** have a 2-person approval for mainnet deployment
6. **Document everything** - Future you will thank present you

✅ **You're ready for mainnet when:**
- All tests pass locally
- All tests pass on devnet
- Code has been reviewed by 2+ people
- No clippy warnings
- No security audit findings
- You've slept 8 hours
- You have the SOL ready
- You have a rollback plan (though you can't actually rollback - you can redeploy)
