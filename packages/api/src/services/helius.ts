import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';

export class HeliusClient {
    private connection: Connection;
    private apiKey: string;

    constructor(apiKey: string, network: 'mainnet' | 'devnet' = 'mainnet') {
        this.apiKey = apiKey;
        const baseUrl = network === 'mainnet' 
            ? 'https://mainnet.helius-rpc.com'
            : 'https://devnet.helius-rpc.com';
        this.connection = new Connection(
            `${baseUrl}/?api-key=${apiKey}`,
            'confirmed'
        );
    }

    /**
     * Fetch parsed transactions for a given address with retries and rate limiting handling
     */
    async getTransactionsForAddress(
        address: string,
        options: { limit?: number; before?: string } = {}
    ): Promise<ParsedTransactionWithMeta[]> {
        const pubkey = new PublicKey(address);
        const limit = options.limit || 50;

        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries) {
            try {
                // First get transaction signatures
                const signatures = await this.connection.getSignaturesForAddress(
                    pubkey,
                    {
                        limit,
                        before: options.before ? options.before : undefined,
                    }
                );

                if (signatures.length === 0) {
                    return [];
                }

                // Extract signature strings
                const signatureStrings = signatures.map((sig) => sig.signature);

                // Fetch transactions one at a time to avoid batch request limits on free tier
                // Batch requests (getParsedTransactions with array) require paid plans
                const parsedTxs: (ParsedTransactionWithMeta | null)[] = [];
                for (const signature of signatureStrings) {
                    try {
                        const tx = await this.connection.getParsedTransaction(signature, {
                    maxSupportedTransactionVersion: 0,
                });
                        if (tx) {
                            parsedTxs.push(tx);
                        }
                        // Small delay to avoid rate limits
                        await new Promise((resolve) => setTimeout(resolve, 100));
                    } catch (err) {
                        // Skip failed transactions
                        console.warn(`Failed to fetch transaction ${signature}:`, err);
                    }
                }

                // Filter out nulls (failed lookups)
                return parsedTxs.filter((tx): tx is ParsedTransactionWithMeta => tx !== null);

            } catch (error: any) {
                console.error(`Error fetching transactions (Attempt ${retries + 1}/${maxRetries}):`, error.message);

                if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
                    // Exponential backoff for rate limits
                    const delay = Math.pow(2, retries) * 1000;
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    retries++;
                } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
                    // Don't retry on 403 (auth/plan issues)
                    throw new Error('Helius API access denied. Check your API key and plan tier.');
                } else {
                    throw error;
                }
            }
        }

        throw new Error(`Failed to fetch transactions for ${address} after ${maxRetries} attempts`);
    }
}
