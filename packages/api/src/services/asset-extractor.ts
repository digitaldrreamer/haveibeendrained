import { ParsedTransactionWithMeta } from '@solana/web3.js';

export interface ExtractedAssets {
  sol: number;
  tokens: Array<{ mint: string; amount: string; decimals: number; uiAmount: number }>;
  nfts: string[]; // NFT mint addresses
}

/**
 * Extract affected assets from a transaction
 * Uses preTokenBalances/postTokenBalances and preBalances/postBalances
 */
export class AssetExtractor {
  /**
   * Extract SOL amount lost from transaction
   */
  static extractSOL(tx: ParsedTransactionWithMeta, walletAddress: string): number {
    if (!tx.meta || !tx.transaction) return 0;

    const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toString());
    const walletIndex = accountKeys.findIndex(addr => addr === walletAddress);
    
    if (walletIndex === -1) return 0;

    const preBalance = tx.meta.preBalances?.[walletIndex] || 0;
    const postBalance = tx.meta.postBalances?.[walletIndex] || 0;
    
    // Calculate SOL lost (including fees)
    const solLost = (preBalance - postBalance) / 1e9;
    
    return Math.max(0, solLost); // Only return if lost (positive)
  }

  /**
   * Extract token transfers from transaction
   * Compares preTokenBalances with postTokenBalances
   */
  static extractTokens(
    tx: ParsedTransactionWithMeta,
    walletAddress: string
  ): Array<{ mint: string; amount: string; decimals: number; uiAmount: number }> {
    if (!tx.meta || !tx.transaction) return [];

    const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toString());
    const transfers: Array<{ mint: string; amount: string; decimals: number; uiAmount: number }> = [];

    // Create maps for balance lookups
    const preMap = new Map<number, any>();
    tx.meta.preTokenBalances?.forEach((bal: any) => {
      preMap.set(bal.accountIndex, bal);
    });

    const postMap = new Map<number, any>();
    tx.meta.postTokenBalances?.forEach((bal: any) => {
      postMap.set(bal.accountIndex, bal);
    });

    // Find all accounts owned by the wallet
    const walletTokenAccounts = new Set<number>();
    postMap.forEach((post, index) => {
      if (post.owner === walletAddress) {
        walletTokenAccounts.add(index);
      }
    });

    // Also check preTokenBalances for accounts that might have been closed
    preMap.forEach((pre, index) => {
      if (pre.owner === walletAddress) {
        walletTokenAccounts.add(index);
      }
    });

    // Compare balances for wallet's token accounts
    for (const accountIndex of walletTokenAccounts) {
      const pre = preMap.get(accountIndex);
      const post = postMap.get(accountIndex);

      // If account was closed, post will be null
      if (!post && pre) {
        // Account was closed - all tokens were lost
        const decimals = pre.uiTokenAmount?.decimals || 0;
        const amount = BigInt(pre.uiTokenAmount?.amount || '0');
        const uiAmount = Number(amount) / Math.pow(10, decimals);
        
        transfers.push({
          mint: pre.mint,
          amount: amount.toString(),
          decimals,
          uiAmount,
        });
        continue;
      }

      if (!post) continue;

      const preAmount = BigInt(pre?.uiTokenAmount?.amount || '0');
      const postAmount = BigInt(post.uiTokenAmount.amount);
      const change = preAmount - postAmount;

      // Only track losses (positive change means wallet lost tokens)
      if (change > 0n) {
        const decimals = post.uiTokenAmount.decimals || 0;
        const uiAmount = Number(change) / Math.pow(10, decimals);

        transfers.push({
          mint: post.mint,
          amount: change.toString(),
          decimals,
          uiAmount,
        });
      }
    }

    return transfers;
  }

  /**
   * Extract NFT transfers (simplified - detects Metaplex NFT transfers)
   * NFTs are typically transferred via Token Program with amount = 1
   */
  static extractNFTs(
    tx: ParsedTransactionWithMeta,
    walletAddress: string
  ): string[] {
    if (!tx.meta || !tx.transaction) return [];

    const nfts: string[] = [];
    const tokenTransfers = this.extractTokens(tx, walletAddress);

    // NFTs typically have:
    // - Amount = 1 (or very small)
    // - Decimals = 0
    // - Transferred via Token Program
    for (const transfer of tokenTransfers) {
      const amount = BigInt(transfer.amount);
      // If amount is 1 and decimals is 0, likely an NFT
      if (amount === 1n && transfer.decimals === 0) {
        nfts.push(transfer.mint);
      }
    }

    return nfts;
  }

  /**
   * Extract all assets from transaction
   */
  static extractAll(
    tx: ParsedTransactionWithMeta,
    walletAddress: string,
    includeExperimental: boolean = false
  ): ExtractedAssets {
    const sol = this.extractSOL(tx, walletAddress);
    
    let tokens: Array<{ mint: string; amount: string; decimals: number; uiAmount: number }> = [];
    let nfts: string[] = [];

    if (includeExperimental) {
      tokens = this.extractTokens(tx, walletAddress);
      nfts = this.extractNFTs(tx, walletAddress);
    }

    return {
      sol,
      tokens,
      nfts,
    };
  }
}

