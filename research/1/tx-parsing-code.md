# Solana Transaction Parsing - Implementation Code Examples

**December 2025 | Have I Been Drained Wallet Security Checker**

---

## Table of Contents

1. [Complete Type Definitions](#complete-type-definitions)
2. [Basic Transaction Fetching](#basic-transaction-fetching)
3. [Token Transfer Extraction](#token-transfer-extraction)
4. [Drain Pattern Detection](#drain-pattern-detection)
5. [Helius Integration](#helius-integration)
6. [Production-Ready Helper Functions](#production-ready-helper-functions)
7. [Testing Strategies](#testing-strategies)

---

## Complete Type Definitions

### Core Types (TypeScript)

```typescript
// src/types/solana.ts

import { PublicKey } from "@solana/web3.js";

/**
 * RPC Response from getTransaction
 * Matches Solana's JSON-RPC API response format
 */
export interface SolanaTransaction {
  blockTime: number;
  meta: TransactionMetadata;
  slot: number;
  transaction: {
    message: Message;
    signatures: string[];
  };
  version?: "legacy" | 0;
}

export interface Message {
  accountKeys: Array<{
    pubkey: string;
    signer: boolean;
    writable: boolean;
  }>;
  header: {
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
    numSignerAccounts: number;
  };
  instructions: (ParsedInstruction | RawInstruction)[];
  recentBlockhash: string;
  addressTableLookups?: AddressTableLookup[];
}

export interface ParsedInstruction {
  parsed: {
    type: string;
    info: Record<string, any>;
  };
  program: string;
  programId: string;
}

export interface RawInstruction {
  accounts: string[];
  data: string;
  programId: string;
}

export interface AddressTableLookup {
  accountKey: string;
  readonlyIndexes: number[];
  writableIndexes: number[];
}

export interface TransactionMetadata {
  err: null | TransactionError;
  fee: number;
  preBalances: number[];
  postBalances: number[];
  preTokenBalances: TokenBalance[];
  postTokenBalances: TokenBalance[];
  innerInstructions?: InnerInstruction[];
  logMessages: string[];
  computeUnitsConsumed?: number;
  returnData?: {
    data: [string, string];
    programId: string;
  };
  loadedAddresses?: {
    readonly: string[];
    writable: string[];
  };
}

export interface TokenBalance {
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

export interface InnerInstruction {
  index: number;
  instructions: (ParsedInstruction | RawInstruction)[];
}

export interface TransactionError {
  InstructionError: [number, string];
}

/**
 * Parsed instruction types for drain detection
 */
export interface TokenTransferInstruction extends ParsedInstruction {
  parsed: {
    type: "transfer";
    info: {
      source: string;
      destination: string;
      authority: string;
      tokenAmount: {
        amount: string;
        decimals: number;
        uiAmount: number;
        uiAmountString: string;
      };
    };
  };
}

export interface ApproveInstruction extends ParsedInstruction {
  parsed: {
    type: "approve";
    info: {
      source: string;
      delegate: string;
      authority: string;
      tokenAmount: {
        amount: string;
        decimals: number;
        uiAmount: number;
        uiAmountString: string;
      };
    };
  };
}

export interface SetAuthorityInstruction extends ParsedInstruction {
  parsed: {
    type: "setAuthority";
    info: {
      account: string;
      authority: string;
      authorityType: "accountOwner" | "mintTokens" | "freezeAccount" | "closeAccount";
      newAuthority: string | null;
    };
  };
}

export interface RevokeInstruction extends ParsedInstruction {
  parsed: {
    type: "revoke";
    info: {
      source: string;
      authority: string;
    };
  };
}

export interface CloseAccountInstruction extends ParsedInstruction {
  parsed: {
    type: "closeAccount";
    info: {
      source: string;
      destination: string;
      owner: string;
    };
  };
}

export interface TransferSolInstruction extends ParsedInstruction {
  parsed: {
    type: "transfer";
    info: {
      source: string;
      destination: string;
      lamports: number;
      authority?: string;
    };
  };
}

/**
 * Drain analysis results
 */
export enum DrainType {
  UNAUTHORIZED_TRANSFER = "unauthorized_transfer",
  APPROVAL_EXPLOIT = "approval_exploit",
  ACCOUNT_AUTHORITY_TRANSFER = "account_authority_transfer",
  MINT_AUTHORITY_TRANSFER = "mint_authority_transfer",
  MULTI_STEP_DRAIN = "multi_step_drain"
}

export interface DetectedDrain {
  transactionSignature: string;
  blockTime: number;
  slot: number;
  
  drainType: DrainType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number; // 0-100
  
  // What was compromised
  affectedAccounts: {
    account: string;
    type: "token_account" | "mint" | "system_account";
    mint?: string;
    preBalance: bigint;
    postBalance: bigint;
    loss: bigint;
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
  authorizedSigners: string[];
  
  // Evidence
  evidence: {
    pattern: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }[];
  
  // Recommendations
  recommendations: string[];
  
  // Raw data for investigation
  affectedInstructions: number[];
  innerInstructionDepth: number;
  relatedPrograms: string[];
  logErrors?: string[];
}

export interface TokenTransfer {
  from: string;
  to: string;
  mint: string;
  amount: bigint;
  decimals: number;
  uiAmount: number;
  transactionSignature: string;
  instructionIndex: number;
  isInner: boolean;
}
```

---

## Basic Transaction Fetching

### Using Standard Solana RPC

```typescript
// src/services/transactionFetcher.ts

import { Connection, Commitment } from "@solana/web3.js";
import { SolanaTransaction } from "../types/solana";

export class TransactionFetcher {
  private connection: Connection;
  private cache: Map<string, SolanaTransaction> = new Map();
  
  constructor(rpcUrl: string = "https://api.mainnet-beta.solana.com") {
    this.connection = new Connection(rpcUrl, "finalized");
  }
  
  /**
   * Fetch transaction with full metadata and versioned transaction support
   */
  async getTransaction(
    signature: string,
    useCache: boolean = true
  ): Promise<SolanaTransaction | null> {
    // Check cache first
    if (useCache && this.cache.has(signature)) {
      return this.cache.get(signature)!;
    }
    
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: "finalized",
        encoding: "jsonParsed",
        maxSupportedTransactionVersion: 0 // CRITICAL: v0 transaction support
      }) as SolanaTransaction | null;
      
      if (tx && useCache) {
        this.cache.set(signature, tx);
      }
      
      return tx;
    } catch (error) {
      console.error(`Failed to fetch transaction ${signature}:`, error);
      return null;
    }
  }
  
  /**
   * Batch fetch multiple transactions
   * Uses Promise.all for parallel requests
   */
  async getTransactionsBatch(
    signatures: string[],
    concurrency: number = 10
  ): Promise<(SolanaTransaction | null)[]> {
    const results: (SolanaTransaction | null)[] = [];
    
    for (let i = 0; i < signatures.length; i += concurrency) {
      const batch = signatures.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(sig => this.getTransaction(sig))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
  
  /**
   * Get all transactions for a wallet address
   */
  async getTransactionHistory(
    walletAddress: string,
    limit: number = 100
  ): Promise<SolanaTransaction[]> {
    const signatures = await this.connection.getSignaturesForAddress(
      new (require("@solana/web3.js").PublicKey)(walletAddress),
      { limit }
    );
    
    const transactions = await this.getTransactionsBatch(
      signatures.map(s => s.signature),
      10
    );
    
    return transactions.filter((tx): tx is SolanaTransaction => tx !== null);
  }
  
  /**
   * Validate transaction structure
   */
  validateTransaction(tx: SolanaTransaction | null): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!tx) {
      errors.push("Transaction is null");
      return { valid: false, errors };
    }
    
    // Check required fields
    if (!tx.transaction?.message?.accountKeys) {
      errors.push("Missing accountKeys in message");
    }
    if (!tx.transaction?.message?.instructions) {
      errors.push("Missing instructions in message");
    }
    if (!tx.meta?.preTokenBalances) {
      errors.push("Missing preTokenBalances in metadata");
    }
    if (!tx.meta?.postTokenBalances) {
      errors.push("Missing postTokenBalances in metadata");
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Clear cache (useful for long-running processes)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
```

---

## Token Transfer Extraction

### Extract Transfers from Balance Changes

```typescript
// src/services/tokenTransferExtractor.ts

import {
  TokenBalance,
  TokenTransfer,
  SolanaTransaction
} from "../types/solana";

export class TokenTransferExtractor {
  /**
   * Extract token transfers from transaction metadata
   * Compares preTokenBalances with postTokenBalances
   */
  extractTransfers(
    tx: SolanaTransaction,
    signature: string
  ): TokenTransfer[] {
    const transfers: TokenTransfer[] = [];
    
    // Validate transaction
    if (!tx.meta || !signature) {
      return transfers;
    }
    
    // Create maps for O(1) lookups
    const preMap = this.createBalanceMap(tx.meta.preTokenBalances || []);
    const postMap = this.createBalanceMap(tx.meta.postTokenBalances || []);
    
    // Get all unique accounts
    const allAccounts = new Set<number>([
      ...preMap.keys(),
      ...postMap.keys()
    ]);
    
    // Compare balances
    for (const accountIndex of allAccounts) {
      const pre = preMap.get(accountIndex);
      const post = postMap.get(accountIndex);
      
      // Account was created in this transaction
      if (!pre && post) {
        transfers.push({
          from: "system",  // Account creation, no source
          to: post.owner,
          mint: post.mint,
          amount: BigInt(post.uiTokenAmount.amount),
          decimals: post.uiTokenAmount.decimals,
          uiAmount: post.uiTokenAmount.uiAmount,
          transactionSignature: signature,
          instructionIndex: 0,
          isInner: false
        });
        continue;
      }
      
      // Account was closed in this transaction
      if (pre && !post) {
        // Balance went to zero
        transfers.push({
          from: pre.owner,
          to: "closed",
          mint: pre.mint,
          amount: BigInt(pre.uiTokenAmount.amount),
          decimals: pre.uiTokenAmount.decimals,
          uiAmount: pre.uiTokenAmount.uiAmount,
          transactionSignature: signature,
          instructionIndex: 0,
          isInner: false
        });
        continue;
      }
      
      // Balance changed
      if (pre && post) {
        const preAmount = BigInt(pre.uiTokenAmount.amount);
        const postAmount = BigInt(post.uiTokenAmount.amount);
        
        if (preAmount !== postAmount) {
          const change = postAmount - preAmount;
          
          transfers.push({
            from: change > 0n ? "transfer_in" : pre.owner,
            to: change > 0n ? post.owner : "transfer_out",
            mint: post.mint,
            amount: change < 0n ? -change : change,
            decimals: post.uiTokenAmount.decimals,
            uiAmount: change < 0n 
              ? -(Number(change) / Math.pow(10, post.uiTokenAmount.decimals))
              : Number(change) / Math.pow(10, post.uiTokenAmount.decimals),
            transactionSignature: signature,
            instructionIndex: 0,
            isInner: false
          });
        }
      }
    }
    
    return transfers;
  }
  
  /**
   * Match balance decreases to recipients
   * Critical for drain detection
   */
  matchTransfersToRecipients(
    preBalances: TokenBalance[],
    postBalances: TokenBalance[]
  ): Map<string, { recipients: string[]; amount: bigint }> {
    const results = new Map<string, { recipients: string[]; amount: bigint }>();
    
    // Get all balance changes
    const changes = this.calculateBalanceChanges(preBalances, postBalances);
    
    // Find all negative changes (losses)
    changes.forEach((change, key) => {
      if (change.delta < 0n) {
        const [owner, mint] = key.split(":");
        
        // Find corresponding gains in same mint
        const recipients: string[] = [];
        let totalGain = 0n;
        
        changes.forEach((gainChange, gainKey) => {
          if (gainChange.delta > 0n) {
            const [gainOwner, gainMint] = gainKey.split(":");
            
            if (gainMint === mint) {
              recipients.push(gainOwner);
              totalGain += gainChange.delta;
            }
          }
        });
        
        // If gains match loss, it's a swap
        // If gains don't match loss, it's a drain
        if (totalGain !== -change.delta) {
          results.set(key, {
            recipients,
            amount: -change.delta - totalGain
          });
        }
      }
    });
    
    return results;
  }
  
  /**
   * Get all SOL transfers from balance changes
   */
  extractSolTransfers(tx: SolanaTransaction, signature: string) {
    const transfers: TokenTransfer[] = [];
    
    const preBalances = tx.meta.preBalances || [];
    const postBalances = tx.meta.postBalances || [];
    const accountKeys = tx.transaction.message.accountKeys;
    
    accountKeys.forEach((acc, index) => {
      const preBalance = preBalances[index] || 0;
      const postBalance = postBalances[index] || 0;
      
      if (preBalance !== postBalance) {
        transfers.push({
          from: postBalance > preBalance ? "system" : acc.pubkey,
          to: postBalance > preBalance ? acc.pubkey : "system",
          mint: "So11111111111111111111111111111111111111112", // Native SOL mint
          amount: BigInt(Math.abs(postBalance - preBalance)),
          decimals: 9,
          uiAmount: Math.abs(postBalance - preBalance) / 1e9,
          transactionSignature: signature,
          instructionIndex: 0,
          isInner: false
        });
      }
    });
    
    return transfers;
  }
  
  /**
   * Private helper: Create map from account index to balance
   */
  private createBalanceMap(
    balances: TokenBalance[]
  ): Map<number, TokenBalance> {
    const map = new Map<number, TokenBalance>();
    balances.forEach(balance => {
      map.set(balance.accountIndex, balance);
    });
    return map;
  }
  
  /**
   * Private helper: Calculate changes between balances
   */
  private calculateBalanceChanges(
    preBalances: TokenBalance[],
    postBalances: TokenBalance[]
  ): Map<string, { delta: bigint }> {
    const preMap = new Map<string, bigint>();
    const postMap = new Map<string, bigint>();
    
    preBalances.forEach(bal => {
      preMap.set(`${bal.owner}:${bal.mint}`, BigInt(bal.uiTokenAmount.amount));
    });
    
    postBalances.forEach(bal => {
      postMap.set(`${bal.owner}:${bal.mint}`, BigInt(bal.uiTokenAmount.amount));
    });
    
    const result = new Map<string, { delta: bigint }>();
    
    const allKeys = new Set([...preMap.keys(), ...postMap.keys()]);
    allKeys.forEach(key => {
      const pre = preMap.get(key) || 0n;
      const post = postMap.get(key) || 0n;
      result.set(key, { delta: post - pre });
    });
    
    return result;
  }
}
```

---

## Drain Pattern Detection

### Sophisticated Pattern Detection

```typescript
// src/services/drainDetector.ts

import {
  SolanaTransaction,
  DetectedDrain,
  DrainType,
  TokenTransfer,
  ParsedInstruction,
  ApproveInstruction,
  SetAuthorityInstruction,
  TokenTransferInstruction
} from "../types/solana";
import { TokenTransferExtractor } from "./tokenTransferExtractor";

export class DrainDetector {
  private extractor: TokenTransferExtractor;
  private knownDrainers: Set<string>;
  
  constructor(knownDrainerAddresses: string[] = []) {
    this.extractor = new TokenTransferExtractor();
    this.knownDrainers = new Set(knownDrainerAddresses);
  }
  
  /**
   * Main drain detection pipeline
   */
  async detect(
    tx: SolanaTransaction,
    signature: string
  ): Promise<DetectedDrain | null> {
    // Quick validation
    if (tx.meta.err) {
      return null; // Failed transaction, no state changes
    }
    
    // Extract all instructions (top-level + inner)
    const allInstructions = this.getAllInstructions(tx);
    
    // Check for drain patterns
    const patterns = this.detectPatterns(tx, allInstructions, signature);
    
    if (patterns.length === 0) {
      return null;
    }
    
    // Aggregate findings into DetectedDrain
    return this.synthesizeDrain(tx, signature, patterns, allInstructions);
  }
  
  /**
   * Pattern 1: SetAuthority to unknown account
   */
  private detectAuthorityTransfer(
    instructions: ParsedInstruction[],
    tx: SolanaTransaction,
    signature: string
  ) {
    const findings = [];
    
    instructions.forEach((instr, idx) => {
      if (!this.isSetAuthorityInstruction(instr)) return;
      
      const parsed = instr as SetAuthorityInstruction;
      const { authorityType, newAuthority, account } = parsed.parsed.info;
      
      // Account owner transfer is most dangerous
      if (authorityType === "accountOwner" && newAuthority) {
        const isKnown = this.isKnownAddress(newAuthority);
        
        findings.push({
          pattern: "ACCOUNT_AUTHORITY_TRANSFER",
          severity: isKnown ? "LOW" : "CRITICAL",
          confidence: isKnown ? 10 : 95,
          description: `Account ${account} ownership transferred to ${newAuthority}`,
          account,
          newAuthority,
          instructionIndex: idx
        });
      }
    });
    
    return findings;
  }
  
  /**
   * Pattern 2: Approval to max uint64 (unlimited)
   */
  private detectUnlimitedApproval(
    instructions: ParsedInstruction[],
    tx: SolanaTransaction,
    signature: string
  ) {
    const findings = [];
    const U64_MAX = (1n << 64n) - 1n;
    
    instructions.forEach((instr, idx) => {
      if (instr.parsed?.type !== "approve") return;
      
      const parsed = instr as ApproveInstruction;
      const { delegate, source } = parsed.parsed.info;
      const amount = BigInt(parsed.parsed.info.tokenAmount.amount);
      
      // Check if unlimited
      if (amount === U64_MAX) {
        const isKnown = this.isKnownAddress(delegate);
        
        findings.push({
          pattern: "UNLIMITED_APPROVAL",
          severity: isKnown ? "LOW" : "HIGH",
          confidence: 85,
          description: `Unlimited approval given to ${delegate}`,
          delegate,
          source,
          instructionIndex: idx
        });
      }
      
      // Check if suspiciously large
      if (amount > 1_000_000_000_000_000_000n) {
        const isKnown = this.isKnownAddress(delegate);
        
        findings.push({
          pattern: "LARGE_APPROVAL",
          severity: isKnown ? "MEDIUM" : "HIGH",
          confidence: 70,
          description: `Unusually large approval (${amount.toString()})`,
          delegate,
          source,
          amount,
          instructionIndex: idx
        });
      }
    });
    
    return findings;
  }
  
  /**
   * Pattern 3: Unmatched balance decreases
   */
  private detectUnmatchedTransfers(
    tx: SolanaTransaction,
    signature: string
  ) {
    const findings = [];
    const transfers = this.extractor.extractTransfers(tx, signature);
    
    // Group by mint
    const byMint = new Map<string, typeof transfers>();
    transfers.forEach(t => {
      if (!byMint.has(t.mint)) {
        byMint.set(t.mint, []);
      }
      byMint.get(t.mint)!.push(t);
    });
    
    // Check balance conservation per mint
    byMint.forEach((mints, mint) => {
      let totalIn = 0n;
      let totalOut = 0n;
      
      mints.forEach(t => {
        if (t.from === "transfer_in") {
          totalIn += t.amount;
        } else if (t.to === "transfer_out") {
          totalOut += t.amount;
        }
      });
      
      // If outputs > inputs, there's a loss
      if (totalOut > totalIn) {
        const loss = totalOut - totalIn;
        
        // Find who lost it
        const losers = new Set<string>();
        mints.forEach(t => {
          if (t.from !== "transfer_in" && t.from !== "system") {
            losers.add(t.from);
          }
        });
        
        // Find who gained
        const gainers = new Set<string>();
        mints.forEach(t => {
          if (t.to !== "transfer_out" && t.to !== "closed") {
            gainers.add(t.to);
          }
        });
        
        findings.push({
          pattern: "UNMATCHED_TRANSFER",
          severity: "MEDIUM",
          confidence: 60,
          description: `${loss.toString()} of ${mint} unaccounted for`,
          mint,
          loss,
          losers: Array.from(losers),
          gainers: Array.from(gainers)
        });
      }
    });
    
    return findings;
  }
  
  /**
   * Pattern 4: Known drainer detected
   */
  private detectKnownDrainer(
    instructions: ParsedInstruction[],
    tx: SolanaTransaction,
    signature: string
  ) {
    const findings = [];
    const transfers = this.extractor.extractTransfers(tx, signature);
    
    transfers.forEach(t => {
      if (this.knownDrainers.has(t.to)) {
        findings.push({
          pattern: "KNOWN_DRAINER",
          severity: "CRITICAL",
          confidence: 100,
          description: `Funds sent to known drainer: ${t.to}`,
          drainer: t.to,
          amount: t.amount,
          mint: t.mint
        });
      }
    });
    
    return findings;
  }
  
  /**
   * Helper: Get all instructions (top-level + inner)
   */
  private getAllInstructions(tx: SolanaTransaction): ParsedInstruction[] {
    const instructions = [
      ...tx.transaction.message.instructions
    ];
    
    tx.meta.innerInstructions?.forEach(group => {
      instructions.push(...group.instructions);
    });
    
    return instructions as ParsedInstruction[];
  }
  
  /**
   * Helper: Detect all patterns
   */
  private detectPatterns(
    tx: SolanaTransaction,
    instructions: ParsedInstruction[],
    signature: string
  ) {
    return [
      ...this.detectAuthorityTransfer(instructions, tx, signature),
      ...this.detectUnlimitedApproval(instructions, tx, signature),
      ...this.detectUnmatchedTransfers(tx, signature),
      ...this.detectKnownDrainer(instructions, tx, signature)
    ];
  }
  
  /**
   * Helper: Synthesize findings into DetectedDrain
   */
  private synthesizeDrain(
    tx: SolanaTransaction,
    signature: string,
    patterns: any[],
    instructions: ParsedInstruction[]
  ): DetectedDrain {
    // Determine severity
    const maxSeverity = ["CRITICAL", "HIGH", "MEDIUM", "LOW"].find(
      severity => patterns.some(p => p.severity === severity)
    ) || "LOW";
    
    // Calculate confidence
    const avgConfidence = patterns.reduce((sum, p) => sum + (p.confidence || 50), 0) / patterns.length;
    
    // Extract affected accounts and recipients
    const transfers = this.extractor.extractTransfers(tx, signature);
    const affectedAccounts = this.identifyAffectedAccounts(
      tx.meta.preTokenBalances || [],
      tx.meta.postTokenBalances || [],
      patterns
    );
    
    // Get unique programs involved
    const programs = new Set(
      instructions.map(i => i.programId).filter(p => p)
    );
    
    return {
      transactionSignature: signature,
      blockTime: tx.blockTime,
      slot: tx.slot,
      drainType: this.inferDrainType(patterns),
      severity: maxSeverity as any,
      confidence: Math.min(100, Math.round(avgConfidence)),
      affectedAccounts,
      suspiciousRecipients: transfers
        .filter(t => !this.isKnownAddress(t.to))
        .map(t => ({
          address: t.to,
          amountReceived: t.amount,
          mint: t.mint,
          isKnownDrainer: this.knownDrainers.has(t.to)
        })),
      attackerAddresses: Array.from(new Set(
        patterns
          .map((p: any) => p.delegate || p.newAuthority || p.drainer)
          .filter(Boolean)
      )),
      authorizedSigners: tx.transaction.message.accountKeys
        .slice(0, tx.transaction.message.header.numSignerAccounts)
        .map(a => a.pubkey),
      evidence: patterns.map(p => ({
        pattern: p.pattern,
        description: p.description,
        severity: p.severity
      })),
      recommendations: this.generateRecommendations(patterns),
      affectedInstructions: patterns.map((p: any) => p.instructionIndex).filter(i => i !== undefined),
      innerInstructionDepth: tx.meta.innerInstructions?.length || 0,
      relatedPrograms: Array.from(programs),
      logErrors: tx.meta.logMessages?.filter(m => m.includes("error"))
    };
  }
  
  /**
   * Helper: Type guards
   */
  private isSetAuthorityInstruction(instr: ParsedInstruction): boolean {
    return instr.parsed?.type === "setAuthority";
  }
  
  /**
   * Helper: Check if address is known (safe)
   */
  private isKnownAddress(address: string): boolean {
    const knownPrograms = [
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // Token Program
      "TokenzQdBNBGqPf546LrvLvLGG1tqZF1QBJolLHUjNw", // Token-2022
      "11111111111111111111111111111111", // System Program
      "ATokenGPvbdGVqstVQmcLsNZAqeEg5b5ddPA7nChSnm4", // ATA Program
      "RayQuery111111111111111111111111111111111111", // Raydium
      "9B5X4SVrnM6jepomq4UcsbMXEsqLKVCKeiTMk737AxM", // Marinade
      // Add more as needed
    ];
    
    return knownPrograms.includes(address);
  }
  
  /**
   * Helper: Infer drain type from patterns
   */
  private inferDrainType(patterns: any[]): DrainType {
    if (patterns.some(p => p.pattern === "ACCOUNT_AUTHORITY_TRANSFER")) {
      return DrainType.ACCOUNT_AUTHORITY_TRANSFER;
    }
    if (patterns.some(p => p.pattern === "UNLIMITED_APPROVAL" || p.pattern === "LARGE_APPROVAL")) {
      return DrainType.APPROVAL_EXPLOIT;
    }
    return DrainType.UNAUTHORIZED_TRANSFER;
  }
  
  /**
   * Helper: Generate recommendations
   */
  private generateRecommendations(patterns: any[]): string[] {
    const recommendations = [];
    
    if (patterns.some(p => p.pattern === "ACCOUNT_AUTHORITY_TRANSFER")) {
      recommendations.push(
        "CRITICAL: Your account ownership was transferred. Immediate action required.",
        "Report this transaction to your wallet provider immediately.",
        "Consider revoking all approvals on compromised accounts."
      );
    }
    
    if (patterns.some(p => p.pattern.includes("APPROVAL"))) {
      recommendations.push(
        "Review and revoke any suspicious approvals.",
        "Use revoke instructions to remove delegate permissions."
      );
    }
    
    recommendations.push(
      "Export your transaction history for investigation.",
      "Contact the wallet security team with this transaction signature.",
      `Signature: ${patterns[0]?.signature}`
    );
    
    return recommendations;
  }
  
  /**
   * Helper: Identify affected accounts
   */
  private identifyAffectedAccounts(
    preBalances: any[],
    postBalances: any[],
    patterns: any[]
  ) {
    const affected = [];
    
    postBalances.forEach((post, idx) => {
      const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
      if (pre) {
        const preAmount = BigInt(pre.uiTokenAmount?.amount || 0);
        const postAmount = BigInt(post.uiTokenAmount?.amount || 0);
        
        if (preAmount > postAmount) {
          affected.push({
            account: post.owner,
            type: "token_account",
            mint: post.mint,
            preBalance: preAmount,
            postBalance: postAmount,
            loss: preAmount - postAmount
          });
        }
      }
    });
    
    return affected;
  }
}
```

---

## Helius Integration

### Simplified Parsing with Helius API

```typescript
// src/services/heliusAnalyzer.ts

import axios from "axios";

interface HeliusTransaction {
  description: string;
  type: string;
  source: string;
  tokenTransfers?: Array<{
    fromUserAccount?: string;
    toUserAccount?: string;
    mint: string;
    tokenAmount: number;
  }>;
  nativeTransfers?: Array<{
    fromUserAccount?: string;
    toUserAccount?: string;
    lamports: number;
  }>;
  fee: number;
  feePayer: string;
  signature: string;
  blockTime: number;
  slot: number;
  status: "Success" | "Failed";
}

export class HeliusAnalyzer {
  private apiKey: string;
  private baseUrl = "https://api.helius.xyz/v0";
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  /**
   * Analyze transaction with Helius Enhanced API
   * Much simpler than manual parsing!
   */
  async analyzeTransaction(
    signature: string
  ): Promise<HeliusTransaction | null> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transactions?api-key=${this.apiKey}`,
        {
          transactions: [signature]
        }
      );
      
      const results = response.data.result;
      if (!results || results.length === 0) {
        return null;
      }
      
      return results[0];
    } catch (error) {
      console.error(`Failed to analyze with Helius:`, error);
      return null;
    }
  }
  
  /**
   * Batch analyze multiple transactions
   */
  async analyzeTransactionsBatch(
    signatures: string[],
    batchSize: number = 100
  ): Promise<HeliusTransaction[]> {
    const results: HeliusTransaction[] = [];
    
    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      
      try {
        const response = await axios.post(
          `${this.baseUrl}/transactions?api-key=${this.apiKey}`,
          {
            transactions: batch
          }
        );
        
        results.push(...(response.data.result || []));
        
        // Rate limiting: wait between batches
        if (i + batchSize < signatures.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Batch failed:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Detect drains with Helius data (much simpler!)
   */
  async detectDrainSimple(signature: string) {
    const tx = await this.analyzeTransaction(signature);
    
    if (!tx || tx.status === "Failed") {
      return null;
    }
    
    const drainIndicators = [];
    
    // Check token transfers to unknown addresses
    if (tx.tokenTransfers) {
      for (const transfer of tx.tokenTransfers) {
        if (transfer.toUserAccount && !this.isKnownAddress(transfer.toUserAccount)) {
          drainIndicators.push({
            type: "SUSPICIOUS_TRANSFER",
            to: transfer.toUserAccount,
            mint: transfer.mint,
            amount: transfer.tokenAmount
          });
        }
      }
    }
    
    // Check native transfers
    if (tx.nativeTransfers) {
      for (const transfer of tx.nativeTransfers) {
        if (transfer.toUserAccount && !this.isKnownAddress(transfer.toUserAccount)) {
          drainIndicators.push({
            type: "SUSPICIOUS_SOL_TRANSFER",
            to: transfer.toUserAccount,
            lamports: transfer.lamports
          });
        }
      }
    }
    
    // Check for unknown program interactions
    if (!this.isKnownProgram(tx.source)) {
      drainIndicators.push({
        type: "UNKNOWN_PROGRAM",
        program: tx.source
      });
    }
    
    return {
      signature,
      description: tx.description,
      blockTime: tx.blockTime,
      indicators: drainIndicators,
      riskLevel: drainIndicators.length > 0 ? "HIGH" : "LOW"
    };
  }
  
  private isKnownAddress(address: string): boolean {
    const known = [
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "11111111111111111111111111111111",
      // Add exchanges, wallets, etc.
    ];
    return known.includes(address);
  }
  
  private isKnownProgram(program: string): boolean {
    const known = [
      "Raydium", "Marinade", "Lido", "Solend",
      "Serum", "Magic Eden", "Jupiter",
      "System Program", "Token Program"
    ];
    return known.some(p => program.includes(p));
  }
}
```

---

## Production-Ready Helper Functions

### Utility Functions

```typescript
// src/utils/transactionUtils.ts

import { PublicKey } from "@solana/web3.js";
import { SolanaTransaction } from "../types/solana";

/**
 * Check if transaction failed
 */
export function transactionFailed(tx: SolanaTransaction): boolean {
  return tx.meta.err !== null;
}

/**
 * Get all signers from transaction
 */
export function getSigners(tx: SolanaTransaction): string[] {
  const message = tx.transaction.message;
  return message.accountKeys
    .slice(0, message.header.numSignerAccounts)
    .map(a => a.pubkey);
}

/**
 * Get all accounts modified (writable) in transaction
 */
export function getModifiedAccounts(tx: SolanaTransaction): string[] {
  const message = tx.transaction.message;
  const writableCount = 
    message.header.numSignerAccounts - message.header.numReadonlySignedAccounts +
    (message.accountKeys.length - message.header.numSignerAccounts - 
     message.header.numReadonlyUnsignedAccounts);
  
  return message.accountKeys
    .slice(0, writableCount)
    .map(a => a.pubkey);
}

/**
 * Calculate net SOL impact per account
 */
export function calculateSolImpact(
  tx: SolanaTransaction
): Map<string, { preBalance: number; postBalance: number; change: number }> {
  const impact = new Map<string, any>();
  const preBalances = tx.meta.preBalances || [];
  const postBalances = tx.meta.postBalances || [];
  const accountKeys = tx.transaction.message.accountKeys;
  
  accountKeys.forEach((acc, idx) => {
    const pre = preBalances[idx] || 0;
    const post = postBalances[idx] || 0;
    
    if (pre !== post) {
      impact.set(acc.pubkey, {
        preBalance: pre,
        postBalance: post,
        change: post - pre
      });
    }
  });
  
  return impact;
}

/**
 * Calculate transaction fee percentage
 */
export function calculateFeePercentage(tx: SolanaTransaction): number {
  const totalFeesPaid = tx.meta.fee;
  const accountKeys = tx.transaction.message.accountKeys;
  const feePayer = accountKeys[0]?.pubkey;
  
  if (!feePayer) return 0;
  
  const impact = calculateSolImpact(tx);
  const feePayerImpact = impact.get(feePayer);
  
  if (!feePayerImpact || feePayerImpact.change >= 0) {
    return 0; // Fee payer actually gained SOL (shouldn't happen)
  }
  
  return Math.abs(feePayerImpact.change) / totalFeesPaid;
}

/**
 * Check if transaction is a multi-sig transaction
 */
export function isMultiSigTransaction(tx: SolanaTransaction): boolean {
  const message = tx.transaction.message;
  return message.header.numSignerAccounts > 1;
}

/**
 * Check if transaction uses address lookup tables
 */
export function usesAddressLookupTables(tx: SolanaTransaction): boolean {
  return !!(tx.transaction.message.addressTableLookups && 
            tx.transaction.message.addressTableLookups.length > 0);
}

/**
 * Check if transaction is versioned (v0)
 */
export function isVersionedTransaction(tx: SolanaTransaction): boolean {
  return tx.version === 0;
}

/**
 * Get all program IDs used in transaction
 */
export function getAllProgramIds(tx: SolanaTransaction): Set<string> {
  const programs = new Set<string>();
  
  // Top-level instructions
  tx.transaction.message.instructions.forEach(instr => {
    programs.add(instr.programId);
  });
  
  // Inner instructions
  tx.meta.innerInstructions?.forEach(group => {
    group.instructions.forEach(instr => {
      programs.add(instr.programId);
    });
  });
  
  return programs;
}

/**
 * Count instruction types in transaction
 */
export function countInstructionTypes(
  tx: SolanaTransaction
): Map<string, number> {
  const counts = new Map<string, number>();
  
  const allInstructions = [
    ...tx.transaction.message.instructions,
    ...(tx.meta.innerInstructions?.flatMap(g => g.instructions) || [])
  ];
  
  allInstructions.forEach(instr => {
    const type = instr.parsed?.type || "unknown";
    counts.set(type, (counts.get(type) || 0) + 1);
  });
  
  return counts;
}

/**
 * Format transaction summary for logging
 */
export function summarizeTransaction(
  tx: SolanaTransaction,
  signature: string
): string {
  const hasError = transactionFailed(tx);
  const signers = getSigners(tx);
  const programCount = getAllProgramIds(tx).size;
  const innerInstructions = tx.meta.innerInstructions?.length || 0;
  
  return `
Transaction: ${signature}
Status: ${hasError ? "FAILED" : "SUCCESS"}
Time: ${new Date(tx.blockTime * 1000).toISOString()}
Slot: ${tx.slot}
Fee: ${tx.meta.fee / 1e9} SOL
Signers: ${signers.length}
Programs: ${programCount}
Inner Instructions: ${innerInstructions}
Compute Units: ${tx.meta.computeUnitsConsumed || "N/A"}
  `.trim();
}
```

---

## Testing Strategies

### Unit Tests

```typescript
// src/__tests__/drainDetector.test.ts

import { DrainDetector } from "../services/drainDetector";
import { SolanaTransaction } from "../types/solana";

describe("DrainDetector", () => {
  let detector: DrainDetector;
  
  beforeEach(() => {
    detector = new DrainDetector([
      "BadDrainerAddress1111111111111111111111"
    ]);
  });
  
  it("should detect SetAuthority drain", async () => {
    const mockTx: SolanaTransaction = {
      blockTime: Math.floor(Date.now() / 1000),
      slot: 123456,
      meta: {
        err: null,
        fee: 5000,
        preBalances: [1000000, 2000000],
        postBalances: [995000, 2000000],
        preTokenBalances: [],
        postTokenBalances: [],
        innerInstructions: [],
        logMessages: []
      },
      transaction: {
        message: {
          accountKeys: [
            { pubkey: "User1111111111111111111111111", signer: true, writable: true },
            { pubkey: "TokenAccount11111111111111111", signer: false, writable: true }
          ],
          header: {
            numSignerAccounts: 1,
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0
          },
          instructions: [
            {
              parsed: {
                type: "setAuthority",
                info: {
                  account: "TokenAccount11111111111111111",
                  authority: "User1111111111111111111111111",
                  authorityType: "accountOwner",
                  newAuthority: "AttackerAddress1111111111111"
                }
              },
              program: "Token",
              programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            }
          ] as any,
          recentBlockhash: "11111111111111111111111111111111"
        },
        signatures: ["sig111111111111111111111111111111111111111111111111"]
      }
    };
    
    const drain = await detector.detect(mockTx, "test_sig");
    
    expect(drain).not.toBeNull();
    expect(drain?.severity).toBe("CRITICAL");
    expect(drain?.drainType).toBeDefined();
  });
  
  it("should detect known drainer", async () => {
    const mockTx: SolanaTransaction = {
      // ... transaction that sends to known drainer
    } as any;
    
    const drain = await detector.detect(mockTx, "test_sig");
    
    expect(drain?.confidence).toBe(100);
  });
  
  it("should ignore safe transfers", async () => {
    const mockTx: SolanaTransaction = {
      // ... normal transaction
    } as any;
    
    const drain = await detector.detect(mockTx, "test_sig");
    
    expect(drain).toBeNull();
  });
});
```

---

## Summary

This implementation covers:

✅ Complete type definitions for all Solana transaction types
✅ Robust transaction fetching with caching
✅ Token transfer extraction using balance diffs
✅ Multi-pattern drain detection
✅ Helius API integration for simplified parsing
✅ Production-ready utility functions
✅ Test examples

For "Have I Been Drained", focus on:

1. **Performance:** Use Helius API for speed and reliability
2. **Accuracy:** Multiple confirmation patterns before flagging
3. **Caching:** Store results to avoid re-parsing
4. **Registry:** Maintain known drainer addresses list
5. **User Experience:** Clear, actionable recommendations

