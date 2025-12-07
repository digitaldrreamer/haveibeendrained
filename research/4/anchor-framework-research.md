# Anchor Framework Best Practices and Security Research
## Comprehensive Guide for "Have I Been Drained" Project

---

## 1. PDA (Program Derived Address) Patterns

### Best Practices for Choosing PDA Seeds

**Canonical Bump Requirement** [1]
- The bump seed is an extra byte (0-255) appended to optional seeds to ensure a valid off-curve address
- Anchor's derivation function iterates from bump 255 down to 0 until finding a valid PDA
- The **first valid bump found is called the "canonical bump"** and should ALWAYS be used
- Critical security principle: Always include canonical bump validation to prevent attacks using non-canonical bumps

**Seed Design Best Practices:**

1. **Deterministic and Unique Combination**
   - Use a combination of fixed strings, user addresses, and numeric identifiers
   - Example: `[b"data", user.key().as_ref(), 1u64.to_le_bytes()]`
   - Each combination should produce exactly one PDA

2. **Use Fixed String Prefixes**
   - Start seeds with fixed byte strings that identify the account type
   - Example: `b"vault"`, `b"user_state"`, `b"metadata"`
   - Prevents accidental collisions across different account types

3. **Include User/Authority Context**
   - Add user public keys when the account relates to a specific user
   - Allows multiple instances of the same account type per user
   - Makes off-chain querying more efficient

4. **Avoid Sensitive Data**
   - Don't include private keys or secrets in seeds
   - Seeds are deterministic and publicly verifiable
   - Use only public, immutable identifiers

### Preventing PDA Collisions While Maintaining Queryability

**Multi-tier PDA Structure for Drainer Registry:**

```rust
// For tracking detected drainers in "Have I Been Drained"

#[derive(Accounts)]
pub struct InitializeDrainerAccount {
    #[account(
        init,
        seeds = [b"drainer", drainer_address.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + DrainerInfo::INIT_SPACE
    )]
    pub drainer_account: Account<'info, DrainerInfo>,
    pub drainer_address: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct DrainerInfo {
    pub address: Pubkey,
    pub detection_count: u32,
    pub total_victims: u32,
    pub last_seen_slot: u64,
    pub confidence_score: u8,
    pub bump: u8,
}
```

**Key Collision Prevention Strategies:**

1. **Separate Account Types with Different Prefixes**
   - Drainer registry: `b"drainer" + address`
   - Victim records: `b"victim" + wallet + drainer_address`
   - Reports: `b"report" + reporter + timestamp`

2. **Queryable Indexing**
   - PDAs with user addresses enable filtering by wallet
   - Off-chain indexers can scan accounts and filter by discriminator and seed components
   - Use Helius or Anchor's indexing tools to query by program owner and data

3. **Avoid Overconstrained Seeds**
   - More seeds = more unique accounts but harder to query
   - Balance specificity with queryability needs

### Storing vs. Deriving the Bump Seed

**Current Best Practice: Store the Bump** [1]

**Why Store Bumps:**
- Performance: Deriving requires iterating through 0-255 possible values
- Each iteration involves cryptographic operations
- Storing as single u8 field costs 1 byte per account
- Recommended for frequently accessed accounts

```rust
#[account]
pub struct MyAccount {
    pub data: u64,
    pub bump: u8,  // Store canonical bump
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let account = &mut ctx.accounts.my_account;
    account.bump = ctx.bumps.my_account;  // Anchor provides canonical bump
    Ok(())
}

pub fn use_account(ctx: Context<UseAccount>) -> Result<()> {
    let account = &ctx.accounts.my_account;
    // Bump already available in account data, no derivation needed
    Ok(())
}
```

**When to Derive Instead:**
- One-time operations (initialization)
- Accounts accessed rarely
- Extreme space optimization needed
- For CPIs where you need to sign: `invoke_signed` requires original seeds including bump

**Performance Impact:**
- Storing bump: ~40 bytes additional rent per account
- Deriving bump: ~200-300 compute units per call
- For active accounts, storing is more efficient

### Performance Implications of Complex PDA Derivation

**Compute Unit Costs:**

| Operation | Compute Units | Notes |
|-----------|--------------|-------|
| Find canonical bump (average) | 200-300 CU | 128 attempts average |
| Deserialize PDA account | 50-100 CU | Depends on account size |
| CPI with multiple PDAs | 500-1000 CU | Each signer PDA checked |
| PDA validation in constraint | 100-150 CU | Anchor handles automatically |

**Optimization Strategies:**

1. **Minimize Seed Components**
   - Each seed increases hashing cost
   - `[b"vault"]` faster than `[b"vault", user, nonce, id]`
   - Group related PDAs

2. **Cache Derived Addresses**
   - Calculate once in client
   - Pass pre-derived address as AccountInfo
   - Verify ownership in program

3. **Batch PDA Operations**
   - Process multiple PDAs in single transaction
   - Reduces per-operation overhead

**For "Have I Been Drained" Drainer Registry:**
```rust
// Efficient single-seed PDA for high-volume lookups
#[account(
    init,
    seeds = [b"drainer", drainer_address.key().as_ref()],
    bump,  // Let Anchor handle derivation once
    payer = authority,
    space = 8 + DrainerInfo::INIT_SPACE
)]
pub drainer_account: Account<'info, DrainerInfo>,
```

---

## 2. Account Management Best Practices

### Calculating Exact Account Size for Rent Exemption

**The Rent Formula** [2]

```
lamports_per_year = (account_size + 128) * annual_rent_rate
minimum_balance = lamports_per_year / 2
```

**Current Constants (as of December 2025):**
- Annual rent rate: ~1.92% of lamports per byte-year
- Minimum balance multiplier: 2x annual rate
- Fixed overhead: 128 bytes per account

**Using Anchor's InitSpace Macro:**

```rust
#[account]
#[derive(InitSpace)]  // Automatically calculates size
pub struct DrainerInfo {
    pub address: Pubkey,           // 32 bytes
    pub detection_count: u32,      // 4 bytes
    pub total_victims: u32,        // 4 bytes
    pub last_seen_slot: u64,       // 8 bytes
    pub confidence_score: u8,      // 1 byte
    pub bump: u8,                  // 1 byte
}
// Total: 32 + 4 + 4 + 8 + 1 + 1 = 50 bytes
// Space needed: 8 (discriminator) + 50 = 58 bytes
// Account size for rent: 58 + 128 = 186 bytes
```

**Manual Calculation (When InitSpace Not Available):**

```rust
pub fn calculate_account_size() -> usize {
    8                           // Anchor discriminator
    + 32                        // Pubkey (address)
    + 4                         // u32 (detection_count)
    + 4                         // u32 (total_victims)
    + 8                         // u64 (last_seen_slot)
    + 1                         // u8 (confidence_score)
    + 1                         // u8 (bump)
    // = 58 bytes
}
```

**Fetching Current Rent Requirement:**

```typescript
// Client-side TypeScript
import { Connection } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const accountSize = 58;  // Size of your account data
const rentLamports = await connection.getMinimumBalanceForRentExemption(accountSize);
console.log(`Need ${rentLamports / 1e9} SOL for rent exemption`);
// Example: ~0.0016 SOL for 58-byte account
```

**CLI Verification:**
```bash
solana rent 58
# Output: 0.0016 SOL
```

### Consequences of Under/Over-sizing

**Undersizing Account:**
- Program cannot write all intended data
- Deserialization fails or reads garbage data
- Transaction fails at the constraint check stage
- Error: `AccountAlreadyInitialized` or `InvalidAccountData`
- **Prevention**: Use InitSpace macro; test thoroughly

**Oversizing Account:**
- Unnecessarily high rent requirement
- Wastes SOL on unused bytes
- Can make accounts non-rent-exempt
- Increased storage burden on network
- **Impact**: ~0.000002 SOL per additional byte annually
- **Prevention**: Calculate exact size; use Anchor size macros

**Real Example for "Have I Been Drained":**
```rust
// WRONG - Too small, won't fit Vec
#[account]
pub struct VictimList {
    pub drainer: Pubkey,
    pub victims: Vec<Pubkey>,  // Dynamic size! Can't allocate fixed space
}

// CORRECT - Use fixed size or separate accounts
#[account]
#[derive(InitSpace)]
pub struct VictimRecord {
    pub drainer: Pubkey,       // 32
    pub victim_wallet: Pubkey, // 32
    pub amount_lost: u64,      // 8
    pub block_time: i64,       // 8
    // Total: 80 bytes + 8 discriminator = 88 bytes
}
```

### Account Resizing (Realloc)

**Using Anchor's Realloc Constraint:**

```rust
#[derive(Accounts)]
pub struct GrowAccount<'info> {
    #[account(
        mut,
        realloc = new_size,
        realloc::payer = payer,
        realloc::zero = true,  // Clear new bytes for safety
    )]
    pub data_account: Account<'info, MyData>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn resize_account(ctx: Context<GrowAccount>, new_size: usize) -> Result<()> {
    // Anchor handles:
    // 1. Calculating size difference
    // 2. Transferring lamports from payer if expanding
    // 3. Deducting from payer's balance
    // 4. Zeroing new memory if realloc::zero = true
    Ok(())
}
```

**Key Realloc Behaviors:**

1. **Growing Account (Expanding)**
   - Additional lamports transferred from payer account
   - Payer must have sufficient balance
   - New bytes are zeroed (if `realloc::zero = true`)
   - Preserves existing data

2. **Shrinking Account (Reducing)**
   - Excess lamports returned to specified destination
   - Must specify `realloc::payer` target for returned SOL
   - Cannot shrink below current data usage

3. **Performance Considerations**
   - Realloc costs ~1000-2000 additional compute units
   - Zeroing memory adds ~100 CU per 32-byte chunk
   - Can fail if exceeds 10 MiB max account size

**Careful: Realloc Pitfalls** [5]

```rust
// DANGEROUS - Realloc without proper payer checks
pub fn expand_without_payer(ctx: Context<BadGrowth>) -> Result<()> {
    ctx.accounts.data_account.realloc(1000, true)?;
    // ERROR: No payer specified, will fail!
}

// SAFE - Proper realloc with constraint
#[derive(Accounts)]
pub struct SafeGrowth<'info> {
    #[account(
        mut,
        realloc = ctx.accounts.data_account.try_borrow_data()?.len() + 32,
        realloc::payer = payer,
        realloc::zero = true,
    )]
    pub data_account: Account<'info, MyData>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

### Account Initialization and Closing Best Practices

**Proper Account Initialization:**

```rust
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,  // Ensures account doesn't exist
        seeds = [b"drainer", drainer_address.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + DrainerInfo::INIT_SPACE
    )]
    pub drainer_account: Account<'info, DrainerInfo>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_drainer(ctx: Context<Initialize>, drainer_address: Pubkey) -> Result<()> {
    let account = &mut ctx.accounts.drainer_account;
    
    // Initialize all fields
    account.address = drainer_address;
    account.detection_count = 0;
    account.total_victims = 0;
    account.last_seen_slot = 0;
    account.confidence_score = 0;
    account.bump = ctx.bumps.drainer_account;
    
    Ok(())
}
```

**Preventing Reinitialization Attacks:** [5]

```rust
// VULNERABLE - Can be reinitialized
pub fn vulnerable_init(ctx: Context<Initialize>) -> Result<()> {
    // Using init_if_needed allows re-initialization!
    let account = &mut ctx.accounts.pda_account;
    account.admin = msg!.caller;  // Attacker can reinit with themselves as admin
    Ok(())
}

// SAFE - Explicit init only
#[derive(Accounts)]
pub struct SafeInit<'info> {
    #[account(
        init,  // Constraint fails if account exists - prevents reinitialization
        payer = payer,
        space = 8 + MyData::INIT_SPACE
    )]
    pub data_account: Account<'info, MyData>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Proper Account Closing:**

```rust
#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(
        mut,
        close = receiver  // Anchor handles closure and lamport transfer
    )]
    pub to_close: Account<'info, MyData>,
    
    #[account(mut)]
    pub receiver: UncheckedAccount<'info>,  // Receives rent lamports
    pub system_program: Program<'info, System>,
}

pub fn close_drainer_report(ctx: Context<CloseAccount>) -> Result<()> {
    // Anchor automatically:
    // 1. Transfers lamports to receiver
    // 2. Marks account as closed (zeroes discriminator)
    // 3. Updates account owner to System Program
    Ok(())
}
```

**Why Account Closing Matters:**
- Reclaims rent-exempt lamports
- Prevents "dead" accounts cluttering the network
- Required for secure account reuse patterns

---

## 3. Security Constraints - Critical Anchor Validation

### Essential Anchor Constraints for Common Account Types

**1. Signer Validation (Critical)**

```rust
#[derive(Accounts)]
pub struct ReportDrainer<'info> {
    // MUST use for any authority check
    pub reporter: Signer<'info>,  // Signature required
    
    // WRONG - Won't validate signature
    pub potential_admin: AccountInfo<'info>,
}
```

**2. Account Ownership Verification**

```rust
#[derive(Accounts)]
pub struct ModifyVault<'info> {
    #[account(
        mut,
        owner = *program_id,  // Verify ownership by current program
        constraint = vault.owner == wallet.key()  // Custom ownership check
    )]
    pub vault: Account<'info, VaultData>,
    pub wallet: Signer<'info>,
}
```

**3. Writable Account Validation**

```rust
#[derive(Accounts)]
pub struct UpdateState<'info> {
    #[account(mut)]  // MUST have mut for modifications
    pub state_account: Account<'info, StateData>,
}

// WRONG - Will fail at runtime if trying to modify
#[derive(Accounts)]
pub struct BadUpdate<'info> {
    pub state_account: Account<'info, StateData>,  // Missing mut
}
```

**4. Executable Program Validation**

```rust
#[derive(Accounts)]
pub struct InvokeOtherProgram<'info> {
    #[account(executable)]  // Ensures this is a program account
    pub other_program: AccountInfo<'info>,
}
```

**5. Token Account Validation** [3]

```rust
#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(
        mut,
        token::mint = mint,
        token::authority = owner,  // Validates token account
    )]
    pub token_account: Account<'info, TokenAccount>,
    
    #[account(mint::token_program = token_program)]
    pub mint: Account<'info, Mint>,
    
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
```

**6. PDA Validation with Canonical Bump** [1]

```rust
#[derive(Accounts)]
pub struct AccessPDA<'info> {
    #[account(
        seeds = [b"data", user.key().as_ref()],
        bump,  // Anchor validates canonical bump
        owner = crate::ID  // Verify owned by this program
    )]
    pub pda: Account<'info, PDATData>,
    pub user: Signer<'info>,
}
```

**7. Rent Exemption**

```rust
#[derive(Accounts)]
pub struct CheckRent<'info> {
    #[account(rent_exempt = enforce)]  // Enforce must stay rent-exempt
    pub account: Account<'info, MyData>,
}
```

**8. Zero-Initialize Constraint**

```rust
#[derive(Accounts)]
pub struct InitWithZero<'info> {
    #[account(
        init,
        space = 8 + MyData::INIT_SPACE,
        zero,  // Zeros entire account before init (safer)
        payer = payer,
    )]
    pub account: Account<'info, MyData>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

### Preventing Common Vulnerabilities

**Account Confusion Attack** [3][5]

```rust
// VULNERABLE - Accepts any account with same data structure
#[derive(Accounts)]
pub struct VulnerableConfusion<'info> {
    pub admin_account: Account<'info, AdminData>,  // Could be anyone's!
}

// SAFE - Validates the specific account expected
#[derive(Accounts)]
pub struct SafeConfusion<'info> {
    #[account(
        seeds = [b"admin"],  // Specific PDA
        bump,
    )]
    pub admin_account: Account<'info, AdminData>,
    
    // Or validate against stored authority
    #[account(constraint = config.admin == admin.key())]
    pub admin: Signer<'info>,
}
```

**Missing Signer Check** [3]

```rust
// VULNERABLE
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // Attacker can pass owner as regular account
    require_keys_eq!(ctx.accounts.owner.key(), expected_owner);
    // But owner isn't required to sign! This is bypassed.
    Ok(())
}

// SAFE
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(constraint = owner.key() == expected_owner)]
    pub owner: Signer<'info>,  // MUST be signer
}
```

**Owner Verification** [3]

```rust
// VULNERABLE - Doesn't verify account owner
pub fn process_account(ctx: Context<Process>) -> Result<()> {
    let data: MyData = MyData::try_from_slice(&ctx.accounts.data.data)?;
    // Data could be from any program!
    Ok(())
}

// SAFE - Anchor verifies automatically
#[derive(Accounts)]
pub struct Process<'info> {
    pub data: Account<'info, MyData>,  // Anchor ensures owner = current program
}
```

**Remaining Accounts Validation** [3][5]

```rust
// VULNERABLE - No validation of remaining_accounts
pub fn process_variable_accounts(ctx: Context<Process>) -> Result<()> {
    for account in ctx.remaining_accounts {
        // Attacker can pass anything here!
        process_untrusted_account(account)?;
    }
    Ok(())
}

// SAFE - Validate each remaining account
pub fn process_variable_accounts(ctx: Context<Process>) -> Result<()> {
    for account in ctx.remaining_accounts {
        // Verify it's owned by correct program
        require_keys_eq!(account.owner, expected_program);
        
        // Verify it's the type we expect
        let discriminator = &account.data.borrow()[0..8];
        require_eq!(discriminator, [expected_disc; 8]);
        
        process_trusted_account(account)?;
    }
    Ok(())
}
```

### Constraint Macro Quick Reference

| Constraint | Purpose | Example |
|-----------|---------|---------|
| `init` | Create new account | `#[account(init, ...)]` |
| `init_if_needed` | Create if missing (⚠️ dangerous) | Avoid; use `init` + proper checks |
| `mut` | Account is writable | `#[account(mut)]` |
| `signer` | Implicit Signer<> check | Automatic with Signer<> type |
| `owner = <pubkey>` | Verify owner | `#[account(owner = token_program)]` |
| `executable` | Must be program account | `#[account(executable)]` |
| `rent_exempt = enforce` | Must stay rent-exempt | `#[account(rent_exempt = enforce)]` |
| `seeds = [...]` | PDA derivation | `#[account(seeds = [b"seed"])]` |
| `bump` | Validate canonical bump | `#[account(bump)]` |
| `close = <account>` | Close account | `#[account(close = receiver)]` |
| `token::mint = <pubkey>` | Token account mint | SPL Token validation |
| `token::authority = <signer>` | Token authority | SPL Token validation |
| `constraint = <expr>` | Custom validation | `#[account(constraint = x.admin == admin.key())]` |

---

## 4. Events and Logging

### Emitting Events in Anchor Programs

**Basic Event Emission:**

```rust
use anchor_lang::emit;

#[event]
pub struct DrainerDetected {
    pub drainer_address: Pubkey,
    pub detection_slot: u64,
    pub total_victims: u32,
    pub confidence_score: u8,
}

pub fn report_drainer(ctx: Context<ReportDrainer>, drainer: Pubkey, victims: u32) -> Result<()> {
    let drainer_detected = DrainerDetected {
        drainer_address: drainer,
        detection_slot: Clock::get()?.slot,
        total_victims: victims,
        confidence_score: 85,
    };
    
    emit!(drainer_detected);  // Broadcast event
    Ok(())
}
```

**Event Size Limits** [21]

- **Standard emit!() logs**: 10 KB max per transaction
- **emit_cpi!() macros**: Larger events via self-CPI, ~50 KB theoretical max
- **Best Practice**: Keep events <1 KB each
- **Warning**: Oversized events are truncated and lost

**Handling Large Event Data:**

```rust
// WRONG - Includes all victim data (too large)
#[event]
pub struct DrainEvent {
    pub drainer: Pubkey,
    pub victims: Vec<Pubkey>,  // Dynamic, unbounded!
    pub amounts: Vec<u64>,
}

// CORRECT - Minimal event data
#[event]
pub struct DrainEvent {
    pub drainer: Pubkey,
    pub victim_count: u32,
    pub total_amount_lost: u64,
    pub transaction_hash: [u8; 32],  // Link to detailed data
}

// Store detailed data separately
#[account]
pub struct DrainDetails {
    pub transaction_hash: [u8; 32],
    pub victims: Vec<Pubkey>,
    pub amounts: Vec<u64>,
}
```

**Using emit_cpi!() for Critical Large Events** [21]

```rust
// Use emit_cpi! only for events that might exceed 10 KB
// Cost: ~3000 additional compute units
#[event]
pub struct LargeDataEvent {
    pub data: [u8; 8192],
}

pub fn emit_large_event(data: [u8; 8192]) -> Result<()> {
    emit_cpi!(LargeDataEvent { data });
    Ok(())
}

// Best practice: Use emit_cpi! sparingly for truly critical events
// Use emit! for normal events (cheaper, sufficient for most use cases)
```

### Off-Chain Indexer Event Consumption

**Indexer Architecture:**

```typescript
// Using Helius or custom indexer to consume events
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection(HELIUS_RPC);
const programId = new PublicKey(PROGRAM_ID);

// Listen to program logs (events)
connection.onLogs(
    programId,
    (logs, context) => {
        // logs.logs contains program output
        const events = parseAnchorEvents(logs.logs);
        
        events.forEach(event => {
            if (event.name === "DrainerDetected") {
                // Index drainer data
                indexDrainer({
                    address: event.data.drainer_address,
                    slot: event.data.detection_slot,
                    victims: event.data.total_victims,
                });
            }
        });
    }
);

function parseAnchorEvents(logs: string[]): Event[] {
    return logs
        .filter(log => log.startsWith("Program data:"))
        .map(log => {
            const data = Buffer.from(log.replace("Program data: ", ""), "base64");
            return deserializeAnchorEvent(data);
        });
}
```

**PostgreSQL Storage Pattern for Events:**

```sql
-- Store indexed events
CREATE TABLE drainer_detections (
    id SERIAL PRIMARY KEY,
    drainer_address VARCHAR(44) NOT NULL,
    detection_slot BIGINT NOT NULL,
    total_victims INT NOT NULL,
    confidence_score SMALLINT,
    detected_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(drainer_address, detection_slot)
);

CREATE TABLE victim_reports (
    id SERIAL PRIMARY KEY,
    drainer_address VARCHAR(44) NOT NULL REFERENCES drainer_detections(drainer_address),
    victim_wallet VARCHAR(44) NOT NULL,
    amount_lost BIGINT,
    reported_at TIMESTAMP,
    UNIQUE(drainer_address, victim_wallet)
);

CREATE INDEX idx_drainer_address ON drainer_detections(drainer_address);
CREATE INDEX idx_victim_wallet ON victim_reports(victim_wallet);
```

### Event Design Best Practices

**What Data to Include:**

✅ **Include:**
- Unique identifiers (public keys, transaction hashes)
- Slot/timestamp for ordering
- Account changes (before/after balances)
- User who triggered action
- Critical state transitions

❌ **Exclude:**
- Large arrays or vectors
- Serialized entire account data
- Private/sensitive information
- Redundant data (use transaction hash as reference)
- Unbounded variable-length data

**Event Design Example for Drainer Registry:**

```rust
#[event]
pub struct DrainerRegistered {
    pub drainer_address: Pubkey,
    pub registrar: Pubkey,
    pub registration_slot: u64,
    pub initial_confidence: u8,
}

#[event]
pub struct VictimReportSubmitted {
    pub drainer: Pubkey,
    pub reporter: Pubkey,
    pub victim_wallet: Pubkey,
    pub report_slot: u64,
    pub proof_hash: [u8; 32],  // Reference to off-chain proof
}

#[event]
pub struct ConfidenceUpdated {
    pub drainer: Pubkey,
    pub old_confidence: u8,
    pub new_confidence: u8,
    pub update_slot: u64,
}
```

---

## 5. Testing: Anchor Program Validation

### Testing Frameworks Comparison

**Bankrun (Recommended for Speed)** [42]

✅ Pros:
- Fast: Tests run in milliseconds (not seconds)
- Time travel: Modify blockchain state/time
- Arbitrary account data: Snapshot mainnet accounts
- In-process execution: No subprocess overhead
- Full Anchor support

❌ Cons:
- JavaScript/TypeScript only
- Not all edge cases covered
- No validator simulation

```typescript
import { startAnchor } from "solana-bankrun";
import { Program } from "@coral-xyz/anchor";

const startTest = async () => {
    const context = await startAnchor(
        "./",
        [],
        [
            {
                // Import mainnet drainer data for testing
                address: new PublicKey(DRAINER_ADDRESS),
                // ... account data
            }
        ]
    );
    
    const client = context.banksClient;
    const payer = context.payer;
    
    // Time travel to specific slot
    await context.warpToSlot(50000000);
};
```

**Solana Test Validator (Full Simulation)** [23][29]

✅ Pros:
- Full blockchain simulation
- All edge cases tested
- Real transaction processing
- Local cluster

❌ Cons:
- Slower (~5-10 seconds per test)
- More setup required
- Requires Docker/local execution

```bash
solana-test-validator \
  --url https://api.mainnet-beta.solana.com \
  --clone <address> \
  --clone-upgradeable-program <program_id> \
  --ledger /tmp/test-ledger
```

**Choosing Between Them:**
- **Unit/integration tests**: Use Bankrun for fast iteration
- **Complex scenarios**: Use Test Validator for comprehensive coverage
- **CI/CD**: Bankrun for speed; Test Validator for acceptance

### Integration Testing Strategy

**Complete Test Example with Bankrun:**

```typescript
import { startAnchor, BanksClient } from "solana-bankrun";
import { Program, AnchorProvider, BankrunProvider } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";

describe("Have I Been Drained Tests", () => {
    let context: ProgramTestContext;
    let program: Program;
    let client: BanksClient;
    let payer: Keypair;

    before(async () => {
        // Initialize test environment
        context = await startAnchor(PROJECT_DIR, [], []);
        client = context.banksClient;
        payer = context.payer;
        
        const provider = new BankrunProvider(context);
        anchor.setProvider(provider);
        program = anchor.workspace.HaveIBeenDrained;
    });

    describe("Drainer Registry", () => {
        it("should register a new drainer", async () => {
            const drainerAddress = new PublicKey("...");
            const authority = anchor.web3.Keypair.generate();
            
            // Fund authority
            await fundAccount(context, authority.publicKey, 1e9);

            // Derive PDA
            const [drainerPda] = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from("drainer"), drainerAddress.toBuffer()],
                program.programId
            );

            // Create transaction
            const tx = await program.methods
                .registerDrainer(drainerAddress)
                .accounts({
                    drainerAccount: drainerPda,
                    authority: authority.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .transaction();

            // Sign and process
            tx.feePayer = payer.publicKey;
            tx.recentBlockhash = context.lastBlockhash;
            tx.sign(payer, authority);

            const result = await client.processTransaction(tx);
            
            // Assertions
            expect(result.result.err).to.be.null;
            
            // Verify account state
            const account = await program.account.drainerInfo.fetch(drainerPda);
            expect(account.address.toString()).to.equal(drainerAddress.toString());
        });

        it("should reject invalid drainer addresses", async () => {
            // Test with zero address
            const invalidAddress = PublicKey.default;
            const tx = /* ... build tx ... */;
            
            const result = await client.processTransaction(tx);
            expect(result.result.err).to.not.be.null;
        });
    });

    describe("Victim Reporting", () => {
        it("should accept victim reports with anti-spam checks", async () => {
            const reporter = anchor.web3.Keypair.generate();
            await fundAccount(context, reporter.publicKey, 1e9);

            const victimWallet = new PublicKey("...");
            const drainerAddress = new PublicKey("...");

            // First report succeeds
            let tx = await submitVictimReport(
                program,
                drainerAddress,
                victimWallet,
                reporter
            );
            
            let result = await client.processTransaction(tx);
            expect(result.result.err).to.be.null;

            // Duplicate report within cooldown fails
            tx = await submitVictimReport(
                program,
                drainerAddress,
                victimWallet,
                reporter
            );
            
            result = await client.processTransaction(tx);
            expect(result.result.err).to.not.be.null;
        });
    });

    describe("Account Constraints", () => {
        it("should validate PDA canonical bump", async () => {
            // Create PDA with wrong bump - should fail
            const wrongBump = 100;  // Not canonical
            
            const tx = /* ... tx with wrong PDA ... */;
            const result = await client.processTransaction(tx);
            
            // Anchor's constraint validation catches this
            expect(result.result.err?.toString()).to.include("ConstraintSeeds");
        });

        it("should enforce signer checks", async () => {
            // Try to invoke without signer
            const accountNotSigner = anchor.web3.Keypair.generate();
            
            const tx = await program.methods
                .restrictedAction()
                .accounts({
                    signer: accountNotSigner.publicKey,  // Not actually signing
                })
                .transaction();

            const result = await client.processTransaction(tx);
            expect(result.result.err).to.not.be.null;
        });
    });
});

// Helper function
async function fundAccount(context: any, publicKey: PublicKey, lamports: number) {
    const ix = SystemProgram.transfer({
        fromPubkey: context.payer.publicKey,
        toPubkey: publicKey,
        lamports,
    });
    
    const tx = new Transaction().add(ix);
    tx.recentBlockhash = context.lastBlockhash;
    tx.sign(context.payer);
    
    await context.banksClient.processTransaction(tx);
}
```

### Testing Error Conditions

```typescript
describe("Error Handling", () => {
    it("should handle account not found errors", async () => {
        const nonexistentPDA = PublicKey.unique();
        
        const tx = await program.methods
            .accessAccount()
            .accounts({
                account: nonexistentPDA,
            })
            .transaction();

        const result = await client.processTransaction(tx);
        
        // Verify proper error type
        expect(result.result.err?.toString()).to.include("AccountNotFound");
    });

    it("should validate rent exemption", async () => {
        // Create account with insufficient lamports
        const insufficientRent = 1000;  // Too small
        
        const tx = /* ... account creation ... */;
        const result = await client.processTransaction(tx);
        
        // Should fail constraint validation
        expect(result.result.err).to.not.be.null;
    });

    it("should catch numeric overflows", async () => {
        const largeAmount = new BN(2).pow(new BN(64));  // u64 overflow
        
        const tx = await program.methods
            .addAmount(largeAmount)
            .accounts({...})
            .transaction();

        const result = await client.processTransaction(tx);
        
        // Anchor/Rust prevents this at type level
        expect(result.result.err?.toString()).to.include("Arithmetic");
    });
});
```

---

## 6. Deployment: Moving to Production

### Deployment Process

**Step 1: Build the Program**

```bash
# Build optimized program
cargo build-sbf --release

# Check program size
ls -lh target/deploy/have_i_been_drained.so
# Example: 450 KB

# Calculate rent requirement
solana rent 450000  # File size in bytes
# Example output: 3.5 SOL
```

**Step 2: Fund Deployment Wallet**

```bash
# For devnet (free airdrop)
solana airdrop 5 -u devnet

# For mainnet (use real SOL)
# Send SOL to your deployment keypair

solana balance -u mainnet-beta
# Output: 4.5 SOL
```

**Step 3: Deploy Program**

```bash
# Deploy with upgrade authority
solana program deploy \
  --program-id target/deploy/have_i_been_drained-keypair.json \
  target/deploy/have_i_been_drained.so \
  -u mainnet-beta \
  --with-compute-unit-price 100

# Output:
# Program Id: HaveIBeenDrained1111111111111111111111111111
# Signature: 5EZ...
```

**Step 4: Verify Deployment**

```bash
# Check program exists
solana program show HaveIBeenDrained111... -u mainnet-beta

# Output:
# Program Id: HaveIBeenDrained111...
# Owner: BPFLoaderUpgradeab1e111111111111111111111111111
# ProgramData Address: HaveIBeenDrained2222...
# Authority (upgrade): <your-keypair-address>
# Executable: true
```

### Program Upgrades and Upgrade Authority

**Upgrade Authority Model:**

```
┌─────────────────────┐
│  Upgrade Authority  │ (Your keypair or Multisig)
│   (can sign)        │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Program Account    │ (The BPFLoaderUpgradeable program)
│  (points to data)   │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Program Data       │ (Actual program code)
│  (executable)       │
└─────────────────────┘
```

**Performing an Upgrade:**

```bash
# Make code changes, rebuild
cargo build-sbf --release

# Deploy update (requires upgrade authority signature)
solana program deploy \
  --program-id target/deploy/have_i_been_drained-keypair.json \
  target/deploy/have_i_been_drained.so \
  -u mainnet-beta

# If new program is larger, Solana auto-extends and charges rent difference
```

**Transferring Upgrade Authority:**

```bash
# Transfer authority to multisig (recommended for mainnet)
solana program set-upgrade-authority \
  HaveIBeenDrained111... \
  --new-upgrade-authority <multisig-pubkey> \
  -u mainnet-beta

# Verify transfer
solana program show HaveIBeenDrained111... -u mainnet-beta
# Authority should now be multisig address
```

**Making a Program Immutable:**

```bash
# Once immutable, can never be upgraded (use cautiously!)
solana program set-upgrade-authority \
  HaveIBeenDrained111... \
  --final \
  -u mainnet-beta

# Verify it's immutable
solana program show HaveIBeenDrained111... -u mainnet-beta
# Authority: (none) - immutable
```

### Deployment Costs and SOL Requirements [23][26][29]

**Breakdown by Program Size:**

| Program Size | Rent Cost | Tx Fee | Total SOL | Mainnet Cost |
|-------------|-----------|--------|-----------|-------------|
| 100 KB | 0.74 SOL | 0.002 SOL | ~0.75 SOL | ~$15 |
| 300 KB | 2.24 SOL | 0.002 SOL | ~2.25 SOL | ~$45 |
| 500 KB | 3.74 SOL | 0.002 SOL | ~3.75 SOL | ~$75 |
| 1 MB | 7.47 SOL | 0.002 SOL | ~7.48 SOL | ~$150 |

**Typical "Have I Been Drained" Program Cost:**
- Program size: ~450 KB
- Estimated cost: ~3.4 SOL (~$68)
- Plus: Optional ProgramData account for upgrades

**Cost Optimization:**

1. **Reduce program size**
   - Remove unused dependencies
   - Use `cargo-bloat` to identify large functions
   - Consider splitting logic into multiple programs

2. **Use devnet/testnet first**
   - Free SOL airdrop (5 SOL per airdrop)
   - Deploy cost-free to test
   - No risk of losing funds

3. **Bundle accounts efficiently**
   - Minimize account storage needs
   - Use PDA derivation instead of separate lookup tables

**Historical Cost Trends:**
```
2023: Program deployment ~$50-200 depending on size
2024: ~$30-100 (SOL price fluctuation)
2025: ~$40-120 (varies with network demand)
```

---

## 7. Sealevel Attacks Repository: Common Vulnerabilities

### What is Sealevel Attacks? [43]

The **Sealevel Attacks** repository (github.com/coral-xyz/sealevel-attacks) is the official Solana Foundation reference for common security exploits unique to the Solana programming model.

**Key Vulnerabilities Documented:**

1. **Account Confusion/Validation**
   - Accepting wrong account type
   - Missing discriminator checks
   - No owner verification

2. **Authority Transfer Attacks**
   - Missing signer checks
   - Weak access controls
   - Authority confusion

3. **PDA/Bump Validation**
   - Using non-canonical bumps
   - Incorrect seed derivation
   - PDA ownership not verified

4. **Data Validation**
   - Unvalidated input data
   - Missing constraint checks
   - Stale/outdated account data

5. **Arithmetic Issues**
   - Integer overflows/underflows (caught by Rust)
   - Incorrect calculations
   - Precision loss

6. **CPI Security**
   - Missing CPI validation
   - Reentrancy vulnerabilities
   - Unchecked accounts in CPIs

7. **Initialization Attacks**
   - Reinitialization vulnerabilities
   - Missing zero-initialization
   - Account state assumptions

**Using Sealevel Attacks for Learning:**

```bash
# Clone the repository
git clone https://github.com/coral-xyz/sealevel-attacks

# Each folder contains:
# 1. Vulnerable implementation (programs/*/programs/)
# 2. Explanation of vulnerability
# 3. Recommended fix (programs/*_fixed/)
# 4. Tests (tests/)

cd sealevel-attacks
cargo build-sbf  # Build all examples
```

---

## 8. Security Audit Checklist for Anchor Programs

### Pre-Deployment Audit Checklist

**A. Account Management**
- [ ] All PDAs use canonical bump validation
- [ ] Account sizes calculated with InitSpace macro
- [ ] No undersized accounts (will fail deserialization)
- [ ] No oversized accounts (wasting rent)
- [ ] Account closing implemented with `close` constraint
- [ ] Rent exemption enforced where needed
- [ ] No reinitialization vulnerabilities (use `init`, not `init_if_needed`)
- [ ] Account data properly initialized in first instruction

**B. Access Control & Signers**
- [ ] All authority actions require signer
- [ ] Signer checks use `Signer<>` type (not manual validation)
- [ ] Owner verification for all accounts
- [ ] Admin/authority stored and validated
- [ ] Multi-sig considered for mainnet authority
- [ ] No unsigned CPIs making important decisions
- [ ] Seeds for PDAs don't include sensitive data

**C. Constraints & Validation**
- [ ] Every mutable account has `mut` constraint
- [ ] Every account access validated
- [ ] `remaining_accounts` properly validated
- [ ] Custom constraints test all edge cases
- [ ] No constraint bypass paths
- [ ] Token accounts validated (mint, authority)
- [ ] Arithmetic won't overflow (Rust types prevent, but verify logic)

**D. Events & Logging**
- [ ] Events emitted for all state changes
- [ ] Event data doesn't exceed 10 KB
- [ ] Off-chain indexing planned
- [ ] Event discriminators unique
- [ ] No sensitive data in events

**E. Program Security**
- [ ] No hardcoded addresses (use `declare_id!`)
- [ ] No use of `UncheckedAccount` without validation
- [ ] CPI signatures verified correctly
- [ ] Reentrancy guards if needed
- [ ] No recursive calls without limits
- [ ] Compute unit usage optimized
- [ ] No unused dependencies

**F. Testing**
- [ ] Unit tests for all instruction handlers
- [ ] Integration tests with Bankrun
- [ ] Error condition tests
- [ ] Constraint validation tests
- [ ] Edge case tests (overflow, underflow, zero)
- [ ] Test coverage >90%
- [ ] No flaky/timing-dependent tests

**G. Code Quality**
- [ ] No `unwrap()` or `.expect()` that could panic
- [ ] Proper error handling with `Result<>`
- [ ] Error messages descriptive
- [ ] Code comments for complex logic
- [ ] No dead code
- [ ] Variable names clear and consistent
- [ ] Magic numbers avoided (use constants)

**H. Deployment Safety**
- [ ] Deployment address matches declare_id!
- [ ] Program tested on devnet first
- [ ] Upgrade authority set correctly
- [ ] Mainnet has separate keypair
- [ ] Sufficient SOL for deployment + buffer
- [ ] Upgrade path documented
- [ ] Rollback plan if needed

### Formal Security Audit Recommendation

**For "Have I Been Drained" Critical Features:**

After internal checklist completion:

1. **Static Analysis**
   - [ ] Run `cargo clippy` for warnings
   - [ ] Use OtterSec's `verify.sh` for Anchor programs
   - [ ] Run `cargo-audit` for dependency vulnerabilities

2. **Dynamic Analysis**
   - [ ] Fuzzing with proptest
   - [ ] Differential testing (mainnet vs. devnet)
   - [ ] Load testing with many concurrent accounts

3. **Code Review**
   - [ ] 2+ developers review high-risk code
   - [ ] Focus on constraints and access controls
   - [ ] Document any assumptions

4. **Professional Audit** (~$10k-50k depending on complexity)
   - Recommended before mainnet deployment
   - Firms: Certik, Halborn, Trail of Bits, OtterSec
   - Timeline: 2-4 weeks

---

## 9. Testing & Deployment Templates

### Anchor Program Template with Best Practices

```rust
use anchor_lang::prelude::*;
use anchor_lang::solana_program;

declare_id!("HaveIBeenDrained1111111111111111111111111111");

#[program]
pub mod have_i_been_drained {
    use super::*;

    // ==================== DRAINER REGISTRY ====================
    
    pub fn register_drainer(
        ctx: Context<RegisterDrainer>,
        drainer_address: Pubkey,
    ) -> Result<()> {
        require_keys_neq!(drainer_address, Pubkey::default(), InvalidAddress);
        
        let drainer_account = &mut ctx.accounts.drainer_account;
        drainer_account.address = drainer_address;
        drainer_account.detection_count = 0;
        drainer_account.total_victims = 0;
        drainer_account.last_seen_slot = Clock::get()?.slot;
        drainer_account.confidence_score = 0;
        drainer_account.bump = ctx.bumps.drainer_account;
        
        emit!(DrainerRegistered {
            drainer_address,
            registrar: ctx.accounts.authority.key(),
            registration_slot: Clock::get()?.slot,
            initial_confidence: 0,
        });
        
        Ok(())
    }

    pub fn report_victim(
        ctx: Context<ReportVictim>,
        victim_wallet: Pubkey,
        amount_lost: u64,
    ) -> Result<()> {
        require_keys_neq!(victim_wallet, Pubkey::default(), InvalidAddress);
        require_gt!(amount_lost, 0, InvalidAmount);
        
        let victim_record = &mut ctx.accounts.victim_record;
        victim_record.drainer = ctx.accounts.drainer_account.address;
        victim_record.victim_wallet = victim_wallet;
        victim_record.amount_lost = amount_lost;
        victim_record.block_time = Clock::get()?.unix_timestamp;
        victim_record.reported_by = ctx.accounts.reporter.key();
        victim_record.bump = ctx.bumps.victim_record;
        
        // Update drainer stats
        ctx.accounts.drainer_account.total_victims += 1;
        
        emit!(VictimReportSubmitted {
            drainer: ctx.accounts.drainer_account.address,
            reporter: ctx.accounts.reporter.key(),
            victim_wallet,
            report_slot: Clock::get()?.slot,
            amount_lost,
        });
        
        Ok(())
    }
}

// ==================== ACCOUNTS ====================

#[derive(Accounts)]
pub struct RegisterDrainer<'info> {
    #[account(
        init,
        seeds = [b"drainer", drainer_address.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + DrainerInfo::INIT_SPACE,
    )]
    pub drainer_account: Account<'info, DrainerInfo>,
    
    pub drainer_address: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReportVictim<'info> {
    #[account(
        seeds = [b"drainer", drainer_account.address.as_ref()],
        bump = drainer_account.bump,
    )]
    pub drainer_account: Account<'info, DrainerInfo>,
    
    #[account(
        init,
        seeds = [b"victim", drainer_account.address.as_ref(), victim_wallet.as_ref()],
        bump,
        payer = reporter,
        space = 8 + VictimRecord::INIT_SPACE,
    )]
    pub victim_record: Account<'info, VictimRecord>,
    
    pub victim_wallet: AccountInfo<'info>,
    
    pub reporter: Signer<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// ==================== ACCOUNT DATA STRUCTURES ====================

#[account]
#[derive(InitSpace)]
pub struct DrainerInfo {
    pub address: Pubkey,              // 32
    pub detection_count: u32,         // 4
    pub total_victims: u32,           // 4
    pub last_seen_slot: u64,          // 8
    pub confidence_score: u8,         // 1
    pub bump: u8,                     // 1
}

#[account]
#[derive(InitSpace)]
pub struct VictimRecord {
    pub drainer: Pubkey,              // 32
    pub victim_wallet: Pubkey,        // 32
    pub amount_lost: u64,             // 8
    pub block_time: i64,              // 8
    pub reported_by: Pubkey,          // 32
    pub bump: u8,                     // 1
}

// ==================== EVENTS ====================

#[event]
pub struct DrainerRegistered {
    pub drainer_address: Pubkey,
    pub registrar: Pubkey,
    pub registration_slot: u64,
    pub initial_confidence: u8,
}

#[event]
pub struct VictimReportSubmitted {
    pub drainer: Pubkey,
    pub reporter: Pubkey,
    pub victim_wallet: Pubkey,
    pub report_slot: u64,
    pub amount_lost: u64,
}

// ==================== ERRORS ====================

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid address")]
    InvalidAddress,
    
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Unauthorized")]
    Unauthorized,
}
```

### Integration Test Template

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { startAnchor, BanksClient } from "solana-bankrun";
import { expect } from "chai";

describe("Have I Been Drained Tests", () => {
    let context;
    let program: Program;
    let client: BanksClient;
    let payer: anchor.web3.Keypair;

    before(async () => {
        context = await startAnchor(
            "./",
            [],
            []
        );
        
        client = context.banksClient;
        payer = context.payer;
        
        const provider = new anchor.BankrunProvider(context);
        anchor.setProvider(provider);
        program = anchor.workspace.HaveIBeenDrained;
    });

    describe("Drainer Registration", () => {
        it("should register a new drainer", async () => {
            const drainerAddress = anchor.web3.PublicKey.unique();
            const authority = anchor.web3.Keypair.generate();
            
            await fundAccount(context, authority.publicKey, 1e9);

            const [drainerPda] = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from("drainer"), drainerAddress.toBuffer()],
                program.programId
            );

            const tx = await program.methods
                .registerDrainer(drainerAddress)
                .accounts({
                    drainerAccount: drainerPda,
                    drainerAddress: drainerAddress,
                    authority: authority.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .transaction();

            tx.feePayer = payer.publicKey;
            tx.recentBlockhash = context.lastBlockhash;
            tx.sign(payer, authority);

            const result = await client.processTransaction(tx);
            expect(result.result.err).to.be.null;

            const account = await program.account.drainerInfo.fetch(drainerPda);
            expect(account.address.toString()).to.equal(drainerAddress.toString());
            expect(account.detectionCount).to.equal(0);
            expect(account.totalVictims).to.equal(0);
        });

        it("should reject invalid addresses", async () => {
            const invalidAddress = anchor.web3.PublicKey.default;
            const authority = anchor.web3.Keypair.generate();
            
            await fundAccount(context, authority.publicKey, 1e9);

            const [drainerPda] = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from("drainer"), invalidAddress.toBuffer()],
                program.programId
            );

            const tx = await program.methods
                .registerDrainer(invalidAddress)
                .accounts({
                    drainerAccount: drainerPda,
                    drainerAddress: invalidAddress,
                    authority: authority.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .transaction();

            tx.feePayer = payer.publicKey;
            tx.recentBlockhash = context.lastBlockhash;
            tx.sign(payer, authority);

            const result = await client.processTransaction(tx);
            expect(result.result.err).to.not.be.null;
        });
    });

    describe("Victim Reporting", () => {
        let drainerPda: anchor.web3.PublicKey;
        let drainerAddress: anchor.web3.PublicKey;

        beforeEach(async () => {
            drainerAddress = anchor.web3.PublicKey.unique();
            const authority = anchor.web3.Keypair.generate();
            await fundAccount(context, authority.publicKey, 1e9);

            [drainerPda] = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from("drainer"), drainerAddress.toBuffer()],
                program.programId
            );

            const tx = await program.methods
                .registerDrainer(drainerAddress)
                .accounts({
                    drainerAccount: drainerPda,
                    drainerAddress: drainerAddress,
                    authority: authority.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .transaction();

            tx.feePayer = payer.publicKey;
            tx.recentBlockhash = context.lastBlockhash;
            tx.sign(payer, authority);

            await client.processTransaction(tx);
        });

        it("should submit victim report", async () => {
            const victimWallet = anchor.web3.PublicKey.unique();
            const reporter = anchor.web3.Keypair.generate();
            await fundAccount(context, reporter.publicKey, 1e9);

            const [victimPda] = anchor.web3.PublicKey.findProgramAddressSync(
                [
                    Buffer.from("victim"),
                    drainerAddress.toBuffer(),
                    victimWallet.toBuffer(),
                ],
                program.programId
            );

            const tx = await program.methods
                .reportVictim(victimWallet, new anchor.BN(1e9))
                .accounts({
                    drainerAccount: drainerPda,
                    victimRecord: victimPda,
                    victimWallet: victimWallet,
                    reporter: reporter.publicKey,
                    payer: reporter.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .transaction();

            tx.feePayer = payer.publicKey;
            tx.recentBlockhash = context.lastBlockhash;
            tx.sign(payer, reporter);

            const result = await client.processTransaction(tx);
            expect(result.result.err).to.be.null;

            const account = await program.account.victimRecord.fetch(victimPda);
            expect(account.victimWallet.toString()).to.equal(victimWallet.toString());
        });
    });
});

async function fundAccount(
    context: any,
    publicKey: anchor.web3.PublicKey,
    lamports: number
) {
    const ix = anchor.web3.SystemProgram.transfer({
        fromPubkey: context.payer.publicKey,
        toPubkey: publicKey,
        lamports,
    });

    const tx = new anchor.web3.Transaction().add(ix);
    tx.recentBlockhash = context.lastBlockhash;
    tx.sign(context.payer);

    await context.banksClient.processTransaction(tx);
}
```

---

## 10. Quick Reference: Key Takeaways for "Have I Been Drained"

### Architectural Recommendations

| Component | Best Practice |
|-----------|---------------|
| **Drainer PDA** | `[b"drainer", drainer_pubkey]` with canonical bump |
| **Victim Records** | `[b"victim", drainer_pubkey, victim_pubkey]` |
| **Events** | Minimal events, reference to Helius indexed data |
| **Testing** | Bankrun for speed, Test Validator for edge cases |
| **Deployment** | Devnet first, then mainnet with multisig authority |

### Critical Security Requirements

1. **Always use canonical bump** - No exceptions
2. **Verify account owners** - Don't trust, verify
3. **Require signers** - Use Signer<> type
4. **Validate constraints** - Test all paths
5. **Emit events** - Enable off-chain tracking
6. **Close accounts** - Reclaim rent lamports
7. **Test thoroughly** - Especially edge cases
8. **Audit before mainnet** - Consider professional review

### Cost Estimation for Mainnet

```
Program Deployment: 3-4 SOL (~$60-80)
Drainer Account (per): 0.002 SOL (~$0.04)
Victim Record (per): 0.004 SOL (~$0.08)
Annual Rent Maintenance: ~0.001 SOL per account

Estimated Monthly Cost for 10k drainers, 100k victims:
- 10,000 drainer accounts × $0.04 = $400 (one-time rent)
- 100,000 victim records × $0.08 = $8,000 (one-time rent)
- Monthly transaction fees: ~$500 (assuming 50k reports/month)
- Total Year 1: ~$14,000
```

---

## References

[1] Solana PDA Documentation: https://solana.com/docs/core/pda
[2] Solana Account Model: https://solana.com/docs/core/accounts
[3] Anchor Security Best Practices: https://threesigma.xyz/blog/rust-and-solana/
[4] Common Vulnerabilities: https://arxiv.org/pdf/2504.07419.pdf
[5] Anchor Constraint Misuse: https://www.quicknode.com/guides/solana-development/anchor/
[21] Event Emission and Logging: https://www.openzeppelin.com/news/svm-spoke-audit
[23] Program Deployment: https://solana.com/docs/intro/quick-start/deploying-programs
[26] Solana Development Costs: https://comfygen112.hashnode.dev/
[29] Deployment Guide: https://solana.com/docs/programs/deploying
[42] Bankrun Testing Framework: https://www.quicknode.com/guides/solana-development/tooling/bankrun
[43] Sealevel Attacks Repository: https://github.com/coral-xyz/sealevel-attacks
