# Solana Transaction Parsing and Analysis Research

**Last Updated:** December 2025  
**Context:** Have I Been Drained wallet security checker

---

## Table of Contents

1. [Transaction Structure](#transaction-structure)
2. [Token Balance Parsing](#token-balance-parsing)
3. [Program Interactions & Instruction Formats](#program-interactions--instruction-formats)
4. [Advanced Features](#advanced-features)
5. [Helius Enhanced API](#helius-enhanced-api)
6. [TypeScript Type Definitions](#typescript-type-definitions)
7. [Edge Cases & Common Pitfalls](#edge-cases--common-pitfalls)
8. [Implementation Guide](#implementation-guide)

---

## Transaction Structure

### Solana Transaction Overview

A Solana transaction consists of two main components:

**Transaction = Signatures + Message**

```
Transaction {
  signatures: Signature[],  // Array of 64-byte signatures
  message: Message         // Transaction instructions and metadata
}
```

### Message Structure

The `Message` contains all instruction execution data:

```
Message {
  header: MessageHeader,           // Account permissions metadata
  account_keys: Pubkey[],          // All accounts referenced
  recent_blockhash: Hash,          // Recent block hash (timestamp)
  instructions: CompiledInstruction[]  // Instructions to execute
  
  // For versioned (v0) transactions only:
  addressTableLookups?: AddressTableLookup[]
}
```

### MessageHeader

The header determines account permissions:

```
MessageHeader {
  num_required_signatures: u8,      // # of signers
  num_readonly_signed_accounts: u8, // Read-only accounts that signed
  num_readonly_unsigned_accounts: u8 // Read-only accounts (no sig)
}
```

**Account Ordering Rule (CRITICAL):**
```
account_keys array order:
[0...num_required_signatures - 1]              = Signer + Writable
[num_required_signatures...num_readonly_signed_accounts] = Signer + Read-only
[remaining signed accounts...]                 = Non-signer + Writable
[trailing accounts...]                         = Non-signer + Read-only
```

This strict ordering allows determining permissions without storing them explicitly.

### CompiledInstruction

Each instruction is compiled into compact form:

```
CompiledInstruction {
  program_id_index: u8,    // Index into account_keys array
  accounts: Vec<u8>,       // Indices into account_keys
  data: Vec<u8>           // Program-specific instruction data (encoded)
}
```

### Transaction Versions

**Legacy Transactions:**
- Original format with fixed account structure
- No address lookup tables
- `version` field is `"legacy"` or `undefined`

**Versioned Transactions (v0):**
- Support for address lookup tables (ALTs)
- Reduces transaction size for large account lists
- `version` field is `0`
- Include `addressTableLookups` in message
- **MUST** set `maxSupportedTransactionVersion: 0` in RPC calls to retrieve

### RPC Request Pattern

```javascript
const tx = await connection.getTransaction(signature, {
  commitment: "finalized",
  encoding: "jsonParsed",
  maxSupportedTransactionVersion: 0  // CRITICAL: enables v0 transaction support
});
```

**Key Parameters:**
- `maxSupportedTransactionVersion: 0` - Required for v0 transactions
- `encoding: "jsonParsed"` - Returns decoded instructions (if program is recognized)
- `encoding: "json"` - Returns base64-encoded instruction data (manual decoding needed)
- `encoding: "base64"` / `"base58"` - Full binary encoding

---

## Token Balance Parsing

### preTokenBalances and postTokenBalances

The most reliable way to identify token transfers is comparing balance changes:

```typescript
interface TokenBalance {
  accountIndex: number;        // Index into transaction.message.accountKeys
  mint: string;                // Token mint address (Pubkey)
  owner: string;               // Account owner (Pubkey)
  uiTokenAmount: {
    uiAmount: number;          // Human-readable amount (with decimals)
    decimals: number;          // Token decimal places
    amount: string;            // Raw amount (as string, no decimals)
    uiAmountString: string;    // UI amount as string
  };
}
```

### Calculating Transfer Amounts

```typescript
interface TokenTransfer {
  from: string;                    // Source account owner
  to: string;                      // Destination account owner
  mint: string;                    // Token mint
  amount: bigint;                  // Transfer amount (raw, no decimals)
  decimals: number;                // For UI display
  uiAmount: number;                // Human-readable amount
}

function extractTokenTransfers(
  tx: ParsedTransaction
): TokenTransfer[] {
  const transfers: TokenTransfer[] = [];
  const preBalances = new Map<number, TokenBalance>();
  
  // Index pre-transaction balances by account index
  tx.meta.preTokenBalances?.forEach(balance => {
    preBalances.set(balance.accountIndex, balance);
  });
  
  // Compare with post-transaction balances
  tx.meta.postTokenBalances?.forEach(postBalance => {
    const preBalance = preBalances.get(postBalance.accountIndex);
    
    if (!preBalance) {
      // New account created in this transaction
      transfers.push({
        from: "system",  // or null
        to: postBalance.owner,
        mint: postBalance.mint,
        amount: BigInt(postBalance.uiTokenAmount.amount),
        decimals: postBalance.uiTokenAmount.decimals,
        uiAmount: postBalance.uiTokenAmount.uiAmount || 0
      });
    } else if (preBalance.uiTokenAmount.amount !== postBalance.uiTokenAmount.amount) {
      // Balance changed
      const preAmount = BigInt(preBalance.uiTokenAmount.amount);
      const postAmount = BigInt(postBalance.uiTokenAmount.amount);
      const change = postAmount - preAmount;
      
      if (change > 0n) {
        transfers.push({
          from: "transfer_in",  // Could be from any account
          to: postBalance.owner,
          mint: postBalance.mint,
          amount: change,
          decimals: postBalance.uiTokenAmount.decimals,
          uiAmount: Number(change) / Math.pow(10, postBalance.uiTokenAmount.decimals)
        });
      } else {
        // For drain detection: who received this?
        // Need to cross-reference with other postTokenBalances
      }
    }
  });
  
  return transfers;
}
```

### Important Caveats

**⚠️ preTokenBalances/postTokenBalances Don't Tell The Full Story:**

```typescript
// Problem: Balance change doesn't tell you WHERE tokens went
// Example: Token A owner loses 100 USDC
// postTokenBalances shows: owner has 100 less USDC
// But where did the 100 USDC go?

// Solution: Cross-reference with other postTokenBalances
// and identify all accounts receiving increases in same mint
```

### Identifying Transfer Destinations

```typescript
function matchTransfersToDestinations(
  preBalances: TokenBalance[],
  postBalances: TokenBalance[]
): { from: string; to: string; mint: string; amount: bigint }[] {
  
  const changes = new Map<string, { mint: string; delta: bigint }>();
  
  // Calculate net changes per (owner, mint) pair
  postBalances.forEach(post => {
    const pre = preBalances.find(
      p => p.accountIndex === post.accountIndex && p.mint === post.mint
    );
    
    const delta = BigInt(post.uiTokenAmount.amount) - 
                  BigInt(pre?.uiTokenAmount.amount || 0);
    
    if (delta !== 0n) {
      const key = `${post.owner}:${post.mint}`;
      changes.set(key, { mint: post.mint, delta });
    }
  });
  
  // Match inflows to outflows
  const transfers = [];
  changes.forEach((post, toKey) => {
    if (post.delta > 0n) {
      // Find corresponding outflow
      changes.forEach((pre, fromKey) => {
        if (pre.delta < 0n && pre.mint === post.mint && 
            pre.delta * -1n === post.delta) {
          transfers.push({
            from: fromKey.split(':')[0],
            to: toKey.split(':')[0],
            mint: post.mint,
            amount: post.delta
          });
        }
      });
    }
  });
  
  return transfers;
}
```

---

## Program Interactions & Instruction Formats

### Common Program IDs

| Program | Address | Purpose |
|---------|---------|---------|
| **Token Program (SPL Token)** | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | Standard token transfers, approvals |
| **Token-2022 Program** | `TokenzQdBNBGqPf546LrvLvLGG1tqZF1QBJolLHUjNw` | Enhanced tokens with extensions |
| **System Program** | `11111111111111111111111111111111` | Create/close accounts, transfer SOL |
| **Associated Token Account Program** | `ATokenGPvbdGVqstVQmcLsNZAqeEg5b5ddPA7nChSnm4` | ATAs for wallets |

### Instruction Formats

#### Transfer Instruction

**Token Program Transfer:**
```
Instruction discriminator: 3 (1 byte)
Amount: u64 (8 bytes)

Total data: 9 bytes

Account order (must be exact):
0. Source token account (writable, signed if owner is signer)
1. Destination token account (writable)
2. Token account owner or delegate (signer)
3. [Optional] Multisig signers...
```

**Parsing from jsonParsed:**
```typescript
interface TransferInstruction {
  type: "transfer";
  info: {
    source: string;           // Token account
    destination: string;      // Token account
    tokenAmount: {
      amount: string;         // Raw amount
      decimals: number;
      uiAmount: number;
      uiAmountString: string;
    };
    authority: string;        // Who authorized (owner or delegate)
  };
}
```

#### Approve Instruction

**Format:**
```
Instruction discriminator: 4 (1 byte)
Amount: u64 (8 bytes)

Total data: 9 bytes

Account order:
0. Token account (writable)
1. Delegate account (receives approval)
2. Token account owner (signer)
3. [Optional] Multisig signers...
```

**Critical for drain detection:**
```typescript
interface ApproveInstruction {
  type: "approve";
  info: {
    source: string;           // Token account being approved
    delegate: string;         // ← DRAINER'S ADDRESS (if malicious)
    tokenAmount: {
      amount: string;         // Approval limit (max they can transfer)
      decimals: number;
      uiAmount: number;
      uiAmountString: string;
    };
    authority: string;        // Account owner
  };
}
```

**Drain Pattern Detection:**
```typescript
function isApprovalDrain(instr: ApproveInstruction): boolean {
  // If amount is near max (type max u64, or max token supply)
  // and delegate is unknown address, likely drain
  const amount = BigInt(instr.info.tokenAmount.amount);
  const U64_MAX = (1n << 64n) - 1n;
  
  return amount === U64_MAX || 
         amount > 1_000_000_000_000_000_000n; // >1 billion of most tokens
}
```

#### SetAuthority Instruction

**Format:**
```
Instruction discriminator: 6 (1 byte)
AuthorityType: u8 (1 byte)
  0 = MintTokens (for Mint accounts)
  1 = FreezeAccount (for Mint accounts)
  2 = AccountOwner (for Token accounts) ← DRAIN VECTOR
  3 = CloseAccount (for Token accounts)
NewAuthority: Option<Pubkey> (33 bytes)
  Some(pubkey) = new authority
  None = disable this authority

Account order:
0. Account being modified (writable)
1. Current authority (signer)
2. [Optional] Multisig signers...
```

**Critical for drain detection:**
```typescript
interface SetAuthorityInstruction {
  type: "setAuthority";
  info: {
    account: string;
    authorityType: "accountOwner" | "mintTokens" | "freezeAccount" | "closeAccount";
    newAuthority: string | null;
    authority: string;
  };
}

// DRAIN PATTERN:
// authorityType: "accountOwner"
// newAuthority: attacker's address
// → Complete account takeover
```

#### Revoke Instruction

**Format:**
```
Instruction discriminator: 5 (1 byte)
No additional data

Account order:
0. Token account (writable)
1. Delegate being revoked (removed from data)
2. Token account owner (signer)
3. [Optional] Multisig signers...
```

**Safe instruction:**
```typescript
interface RevokeInstruction {
  type: "revoke";
  info: {
    source: string;      // Token account having approval revoked
    authority: string;   // Account owner
  };
}
```

#### CloseAccount Instruction

**Format:**
```
Instruction discriminator: 9 (1 byte)
No additional data

Account order:
0. Account to close (writable)
1. Destination for lamports (writable)
2. Account owner (signer)
3. [Optional] Multisig signers...
```

```typescript
interface CloseAccountInstruction {
  type: "closeAccount";
  info: {
    source: string;      // Account being closed
    destination: string; // Where lamports go
    owner: string;       // Account owner
  };
}
```

---

## Advanced Features

### Inner Instructions & Cross-Program Invocations (CPI)

**Inner instructions** are instructions executed by called programs:

```typescript
interface TransactionMetadata {
  // Top-level instructions
  instructions: Instruction[];
  
  // Inner instructions (CPI execution)
  innerInstructions?: {
    index: number;           // Which top-level instruction triggered these
    instructions: Instruction[];
  }[];
}
```

**Example: Swap via Raydium**
```
Top-level instruction:
  Program: Raydium swap program
  Data: Swap parameters

Inner instructions (executed by Raydium):
  1. Token Program Transfer (user -> Raydium pool)
  2. Token Program Transfer (pool -> user, different token)
  3. Sync Native (if SOL involved)
  
Result: Multi-token swap tracked as:
  - Balance change in Token A (down)
  - Balance change in Token B (up)
```

### Parsing Nested Instructions

```typescript
function extractAllInstructions(tx: ParsedTransaction) {
  const allInstructions = [
    ...tx.transaction.message.instructions
  ];
  
  // Process inner instructions
  tx.meta.innerInstructions?.forEach(innerGroup => {
    allInstructions.push(...innerGroup.instructions);
  });
  
  return allInstructions;
}

// Critical for drain detection:
// An attacker might execute the malicious instruction as CPI
// to hide it from simple top-level instruction scanning
```

### Address Lookup Tables (ALTs) in v0 Transactions

**Why they matter:**
- Reduce transaction size by replacing full pubkeys with u8 indices
- Reuse same lookup table in multiple transactions
- v0 transactions can be 3-5x smaller

**Structure:**
```typescript
interface AddressTableLookup {
  accountKey: string;       // ALT account address
  readonlyIndexes: number[]; // Indices for read-only accounts
  writableIndexes: number[]; // Indices for writable accounts
}

// Account resolution:
// 1. Use first N addresses from message.staticAccounts[]
// 2. Append addresses from addressTableLookups[].readonlyIndexes
// 3. Append addresses from addressTableLookups[].writableIndexes
```

**For drain detection:**
```typescript
function resolveAccountFromAlt(
  altIndex: number,
  altData: Buffer
): string {
  // ALT account data structure:
  // [8 bytes: header]
  // [32 bytes: authority]
  // [32 bytes: deactivation slot]
  // [4 bytes: length]
  // [32*N bytes: addresses...]
  
  const BASE_OFFSET = 8 + 32 + 32 + 4;
  const addressOffset = BASE_OFFSET + (altIndex * 32);
  const address = altData.slice(addressOffset, addressOffset + 32);
  
  // Convert to base58 pubkey
  return bs58.encode(address);
}
```

### Multiple Signers

```typescript
// Extract all signers from header + account_keys ordering
function extractSigners(tx: ParsedTransaction): string[] {
  const message = tx.transaction.message;
  const header = message.header;
  
  // First num_required_signatures accounts are signers
  return message.accountKeys.slice(0, header.numSignerAccounts);
}
```

---

## Helius Enhanced API

### Standard RPC vs Helius Enhanced API

| Feature | Standard `getTransaction` | Helius Enhanced API |
|---------|--------------------------|-------------------|
| **Basic parsing** | Instructions base64 encoded | Full JSON parsing |
| **Token transfers** | Raw balance diffs | Extracted transfer objects |
| **Program recognition** | Limited (major programs only) | Comprehensive (100+ programs) |
| **Multi-hop swaps** | Raw inner instructions | Aggregated as single swap |
| **Instruction types** | Generic instruction | Typed instructions with fields |
| **Error handling** | Limited error info | Detailed error logs |
| **Account changes** | Pre/post balances + tokens | Enriched with account labels |
| **Performance** | Standard latency | Optimized routing |

### Helius Enhanced Transaction API

**Endpoint:** `POST https://api.helius.xyz/v0/transactions`

```typescript
interface HeliusEnhancedTransaction {
  description: string;              // Human-readable summary
  type: "TRANSFER" | "SWAP" | "NFT_SALE" | etc;
  source: string;                   // Program origin
  
  // Parsed transfer details
  tokenTransfers: {
    fromUserAccount?: string;
    toUserAccount?: string;
    mint: string;
    tokenAmount: number;
    tokenStandard: "Fungible" | "FungibleAsset" | "NonFungible" | "NonFungibleEdition";
  }[];
  
  // Native SOL transfers
  nativeTransfers?: {
    fromUserAccount?: string;
    toUserAccount?: string;
    lamports: number;
  }[];
  
  // Account state changes
  accountData?: {
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: {
      mint: string;
      rawTokenAmount: string;
      tokenAmount: number;
    }[];
  }[];
  
  // Fee info
  fee: number;
  feePayer: string;
  signature: string;
  blockTime: number;
  slot: number;
  status: "Success" | "Failed";
}
```

### Helius Advantages for Drain Detection

```typescript
// 1. Automatic drainer detection
const transfers = heliusData.tokenTransfers;
// Already parsed - no need to cross-reference balances

// 2. Program type classification
if (heliusData.source === "Solend" || heliusData.source === "Marinade") {
  // Legitimate DeFi program
} else if (heliusData.source === "Unknown") {
  // Flag for investigation
}

// 3. Multi-program interactions simplified
// Instead of parsing 50 inner instructions, get aggregated result:
// "User swapped 100 USDC for 50 ORCA on Raydium"
// (Helius does the hard work)

// 4. Account labeling
// Identifies: "FTX Drain Address", "Validator Fee Account", etc.
```

### Using Helius Enhanced API with Your Drain Detector

```typescript
import axios from "axios";

async function analyzeWithHelius(signature: string) {
  const response = await axios.post(
    `https://api.helius.xyz/v0/transactions?api-key=${HELIUS_API_KEY}`,
    {
      transactions: [signature]
    }
  );
  
  const heliusTx = response.data.result[0];
  
  // Red flags for drain:
  const drainIndicators = [];
  
  // 1. Unexpected token movements
  for (const transfer of heliusTx.tokenTransfers || []) {
    if (!isKnownAddress(transfer.toUserAccount)) {
      drainIndicators.push({
        type: "UNKNOWN_RECIPIENT",
        mint: transfer.mint,
        amount: transfer.tokenAmount,
        to: transfer.toUserAccount
      });
    }
  }
  
  // 2. Authority transfers to unknown accounts
  if (heliusTx.type === "ACCOUNT_AUTHORITY_TRANSFER") {
    // SetAuthority instruction detected
    drainIndicators.push({
      type: "AUTHORITY_TRANSFER",
      details: heliusTx // Helius already parsed this
    });
  }
  
  // 3. Large approvals to unknown delegates
  // (Helius Enhanced API includes this in parsed instructions)
  
  return drainIndicators;
}
```

### Helius Pricing & Rate Limits

- **Free tier:** 10 requests/second, 50 calls/month
- **Pro tier ($15/month):** 100 requests/second, unlimited calls
- **Enterprise:** Custom pricing

**Cost-benefit:** For drain detection at scale, worth $15/month vs. building custom parser

---

## TypeScript Type Definitions

### Complete Transaction Types

```typescript
// RPC Response for getTransaction
interface GetTransactionResponse {
  blockTime: number;
  meta: TransactionMeta;
  slot: number;
  transaction: Transaction;
  version?: "legacy" | 0;
}

interface Transaction {
  message: Message;
  signatures: string[];  // base58 encoded
}

interface Message {
  accountKeys: {
    pubkey: string;
    signer: boolean;
    writable: boolean;
  }[];
  header: {
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
    numSignerAccounts: number;
  };
  instructions: ParsedInstruction[] | UnparsedInstruction[];
  recentBlockhash: string;
  
  // v0 only:
  addressTableLookups?: AddressTableLookup[];
}

interface ParsedInstruction {
  parsed: {
    type: string;
    info: Record<string, any>;
  };
  program: string;
  programId: string;
}

interface UnparsedInstruction {
  accounts: string[];
  data: string;  // base64 or base58
  programId: string;
}

interface TransactionMeta {
  err: null | { InstructionError: [number, string] };
  fee: number;
  
  // SOL balance changes (lamports)
  preBalances: number[];
  postBalances: number[];
  
  // Token balance changes
  preTokenBalances: TokenBalance[];
  postTokenBalances: TokenBalance[];
  
  // Inner instructions (CPI)
  innerInstructions: {
    index: number;
    instructions: ParsedInstruction[];
  }[];
  
  // Log messages from programs
  logMessages: string[];
  
  // Compute units
  computeUnitsConsumed?: number;
  
  // Return data from programs
  returnData?: {
    data: [string, string]; // [base64_data, "base64"]
    programId: string;
  };
}

interface TokenBalance {
  accountIndex: number;
  mint: string;
  owner: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number;
    uiAmountString: string;
  };
}

interface AddressTableLookup {
  accountKey: string;
  readonlyIndexes: number[];
  writableIndexes: number[];
}
```

### Drain Detection Type

```typescript
enum DrainType {
  UNAUTHORIZED_TRANSFER = "unauthorized_transfer",
  APPROVAL_EXPLOIT = "approval_exploit",
  ACCOUNT_AUTHORITY_TRANSFER = "account_authority_transfer",
  MINT_AUTHORITY_TRANSFER = "mint_authority_transfer",
  MULTI_STEP_DRAIN = "multi_step_drain"
}

interface DetectedDrain {
  transactionSignature: string;
  drainType: DrainType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  
  // What was compromised
  affectedAccounts: {
    account: string;
    type: "token_account" | "mint" | "system_account";
    mint?: string;  // If token account
    lostAmount?: bigint;
  }[];
  
  // Where funds went
  suspiciousRecipients: {
    address: string;
    amountReceived: bigint;
    mint: string;
    isKnownDrainer: boolean;
  }[];
  
  // Who did it
  attackerAddresses: string[];
  
  // Context
  innerInstructionDepth: number;
  relatedPrograms: string[];
  logErrors?: string[];
  
  // Recommendations
  recommendations: string[];
}
```

---

## Edge Cases & Common Pitfalls

### Edge Case 1: Self-Transfers

```typescript
// Problem: Transfer from A to A succeeds (no-op)
// Solution: Verify source !== destination

function isMeaningfulTransfer(instr: TransferInstruction): boolean {
  return instr.info.source !== instr.info.destination;
}
```

### Edge Case 2: Failed Transactions

```typescript
// Problem: Failed transactions still appear in preTokenBalances/postTokenBalances
// Solution: Check meta.err field

if (tx.meta.err) {
  console.log("Transaction failed:", tx.meta.err);
  // Don't treat balance changes as real
}
```

### Edge Case 3: Multi-Hop Swaps

```typescript
// Raw approach (wrong for drain detection):
// See: User has 100 USDC, then 0 USDC
// Think: Drained!
// But actually: Swapped 100 USDC for 50 ORCA via Raydium

// Solution: Check if balance decrease has matching increase elsewhere
function isSwapNotDrain(
  preBalances: TokenBalance[],
  postBalances: TokenBalance[]
): boolean {
  // Same total value before/after = swap
  // Total value decreased = drain
  
  const preValue = sumAllTokenValues(preBalances);
  const postValue = sumAllTokenValues(postBalances);
  
  return postValue >= preValue * 0.95;  // Allow 5% slippage
}
```

### Edge Case 4: Rent Reclamation

```typescript
// Problem: Closing account shows balance transfer (rent refund)
// Not actual token movement

// CloseAccount instruction:
// - Empties token account
// - Refunds lamports to destination
// - Different from unauthorized transfer

if (instr.type === "closeAccount") {
  // This is expected in maintenance/cleanup
  // Not a drain
}
```

### Edge Case 5: Compressed NFTs & Metadata Programs

```typescript
// Problem: NFT transfers don't use Token Program
// They use:
// - Bubblegum Program (for compressed NFTs)
// - Metaplex Token Metadata Program

// Solution: Scan for these program IDs separately
const BUBBLEGUM_PROGRAM = "BGUmaZR8cFYfLWysKz6QKfuLaGjM9eqVUQNgvDv2VcSR";
const METADATA_PROGRAM = "metaqbxxUerdq28cj1RbAqRwBvxJ4cDjPwWreFd8J2";

function findNFTMovements(tx: ParsedTransaction) {
  // Scan for these program IDs
  // Parse differently than token transfers
}
```

### Edge Case 6: Token-2022 Extensions

```typescript
// Token-2022 (TokenzQdBNBGqPf546LrvLvLGG1tqZF1QBJolLHUjNw) has:
// - Transfer hooks (custom logic before/after transfer)
// - Confidential transfers (encrypted amounts)
// - Interest-bearing tokens
// - Programmable transaction processors

// These may have different instruction structures
// Use Helius Enhanced API (handles this automatically)
// OR manually parse Token-2022 instruction discriminators
```

### Edge Case 7: Delegate Chain

```typescript
// Problem: Can approve a delegate, then that delegate approves another
// Delegate-of-delegate scenario

// Track delegate relationships across transactions
interface ApprovalChain {
  originalOwner: string;
  delegates: {
    address: string;
    limit: bigint;
    approvedInTxn: string;
  }[];
}

// Detection: If owner's tokens move via delegate chain
// Even though original owner didn't sign = drain
```

### Edge Case 8: Unwrapped SOL in Token Accounts

```typescript
// Native mint: So11111111111111111111111111111111111111112
// Wrapping SOL in token account allows it to be transferred like tokens

// These appear in preTokenBalances/postTokenBalances
// Treat same as other tokens

const NATIVE_MINT = "So11111111111111111111111111111111111111112";

if (transfer.mint === NATIVE_MINT) {
  // This is wrapped SOL
  // Track as token transfer
}
```

---

## Implementation Guide

### Step 1: Basic Transaction Fetching

```typescript
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");

async function getTransactionData(signature: string) {
  const tx = await connection.getTransaction(signature, {
    commitment: "finalized",
    encoding: "jsonParsed",
    maxSupportedTransactionVersion: 0
  });
  
  if (!tx) {
    throw new Error(`Transaction ${signature} not found`);
  }
  
  return tx;
}
```

### Step 2: Extract Token Transfers

```typescript
function extractAllTokenTransfers(tx: any) {
  const transfers = [];
  
  // Account for new accounts created
  const preMap = new Map<number, any>();
  tx.meta.preTokenBalances?.forEach((bal: any) => {
    preMap.set(bal.accountIndex, bal);
  });
  
  // Compare post balances
  tx.meta.postTokenBalances?.forEach((post: any) => {
    const pre = preMap.get(post.accountIndex);
    const preAmount = BigInt(pre?.uiTokenAmount?.amount || 0);
    const postAmount = BigInt(post.uiTokenAmount.amount);
    
    if (preAmount !== postAmount) {
      transfers.push({
        accountIndex: post.accountIndex,
        owner: post.owner,
        mint: post.mint,
        preAmount,
        postAmount,
        change: postAmount - preAmount
      });
    }
  });
  
  return transfers;
}
```

### Step 3: Cross-Reference with Instructions

```typescript
function findTokenTransfersInInstructions(tx: any) {
  const allInstructions = [
    ...tx.transaction.message.instructions,
    ...(tx.meta.innerInstructions?.flatMap((i: any) => i.instructions) || [])
  ];
  
  return allInstructions.filter((instr: any) => {
    // Token Program
    if (instr.programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
      return instr.parsed?.type === "transfer";
    }
    // Token-2022
    if (instr.programId === "TokenzQdBNBGqPf546LrvLvLGG1tqZF1QBJolLHUjNw") {
      return instr.parsed?.type === "transfer";
    }
    return false;
  });
}
```

### Step 4: Detect Suspicious Patterns

```typescript
interface SuspiciousPattern {
  pattern: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  evidence: string[];
}

function detectDrainPatterns(tx: any): SuspiciousPattern[] {
  const patterns: SuspiciousPattern[] = [];
  
  const allInstructions = [
    ...tx.transaction.message.instructions,
    ...(tx.meta.innerInstructions?.flatMap((i: any) => i.instructions) || [])
  ];
  
  // Pattern 1: SetAuthority to unknown account
  allInstructions.forEach((instr: any, idx: number) => {
    if (instr.parsed?.type === "setAuthority") {
      const authorityType = instr.parsed.info.authorityType;
      const newAuth = instr.parsed.info.newAuthority;
      
      if (authorityType === "accountOwner" && newAuth) {
        patterns.push({
          pattern: "ACCOUNT_AUTHORITY_TRANSFER",
          severity: "CRITICAL",
          evidence: [
            `Instruction ${idx}: Transfer account ownership`,
            `New owner: ${newAuth}`,
            `Check if this is expected`
          ]
        });
      }
    }
  });
  
  // Pattern 2: Large approval to unknown account
  allInstructions.forEach((instr: any, idx: number) => {
    if (instr.parsed?.type === "approve") {
      const amount = BigInt(instr.parsed.info.tokenAmount.amount);
      const U64_MAX = (1n << 64n) - 1n;
      
      if (amount === U64_MAX) {
        patterns.push({
          pattern: "UNLIMITED_APPROVAL",
          severity: "HIGH",
          evidence: [
            `Instruction ${idx}: Unlimited approval`,
            `Delegate: ${instr.parsed.info.delegate}`,
            `This is a common drain vector`
          ]
        });
      }
    }
  });
  
  // Pattern 3: Balance decrease without corresponding increase
  const transfers = extractAllTokenTransfers(tx);
  const decreases = transfers.filter(t => t.change < 0n);
  const increases = transfers.filter(t => t.change > 0n);
  
  decreases.forEach(dec => {
    const matchingIncrease = increases.find(inc => 
      inc.mint === dec.mint && 
      inc.change === -dec.change
    );
    
    if (!matchingIncrease) {
      patterns.push({
        pattern: "UNMATCHED_DECREASE",
        severity: "MEDIUM",
        evidence: [
          `Account ${dec.owner} lost ${dec.change} of mint ${dec.mint}`,
          `No corresponding increase found`,
          `May indicate drain or swap`
        ]
      });
    }
  });
  
  return patterns;
}
```

### Step 5: Integration with Helius (Recommended)

```typescript
import axios from "axios";

async function analyzeWithHelius(
  signature: string,
  heliusApiKey: string
) {
  const response = await axios.post(
    `https://api.helius.xyz/v0/transactions?api-key=${heliusApiKey}`,
    {
      transactions: [signature]
    }
  );
  
  const heliusTx = response.data.result[0];
  
  return {
    description: heliusTx.description,
    type: heliusTx.type,
    status: heliusTx.status,
    tokenTransfers: heliusTx.tokenTransfers || [],
    nativeTransfers: heliusTx.nativeTransfers || [],
    accountData: heliusTx.accountData || [],
    fee: heliusTx.fee,
    signature: heliusTx.signature,
    blockTime: heliusTx.blockTime
  };
}
```

---

## Best Practices & Recommendations

### For "Have I Been Drained" Project

1. **Primary Parsing Strategy:**
   - Use Helius Enhanced API for 80% of cases (faster, more reliable)
   - Fall back to manual parsing for unrecognized programs
   - Cache results to stay within rate limits

2. **Drain Detection Focus:**
   - **Highest priority:** SetAuthority + unknown recipient
   - **High priority:** Unlimited approval + unknown delegate
   - **Medium priority:** Large unexpected transfers
   - **Low priority:** Small cleanup transactions

3. **Performance Optimization:**
   ```typescript
   // Batch requests to Helius
   async function analyzeMultipleTransactions(signatures: string[]) {
     // Send 10 at a time (stay under rate limits)
     const batches = chunk(signatures, 10);
     for (const batch of batches) {
       await analyzeWithHelius(batch);
       await delay(500); // Rate limit compliance
     }
   }
   ```

4. **Known Drainer Registry:**
   - Maintain database of known drainer addresses (from community)
   - Cross-reference all recipients against this list
   - Report matches with high confidence

5. **False Positive Reduction:**
   - Whitelist legitimate programs (Serum, Raydium, Marinade)
   - Require multiple suspicious patterns for "CRITICAL" severity
   - Check if SetAuthority is to a known oracle/validator

6. **Data Retention:**
   - Cache parsed transactions in PostgreSQL
   - Avoid re-fetching same signature multiple times
   - Index by mint, owner, delegate for fast queries

---

## References & Further Reading

- **Solana Official Docs:** https://solana.com/docs/core/transactions
- **SPL Token Program:** https://www.solana-program.com/docs/token
- **Token-2022 Extensions:** https://github.com/solana-labs/solana-program-library/tree/master/token-2022
- **Helius API Docs:** https://www.helius.dev/docs
- **Anchor Framework IDL:** https://github.com/coral-xyz/anchor
- **Metaplex Token Metadata:** https://github.com/metaplex-foundation/metaplex-program-library
- **Solana Phishing Research:** arxiv.org/html/2505.04094v1 (Academic analysis of drain types)

