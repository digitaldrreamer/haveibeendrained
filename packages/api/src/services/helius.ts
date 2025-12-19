import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';

export class HeliusClient {
    private connection: Connection;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.connection = new Connection(
            `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
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
                const transactions = await this.connection.getParsedSignaturesForAddress(
                    pubkey,
                    {
                        limit,
                        before: options.before,
                    }
                );

                const signatures = transactions.map((tx) => tx.signature);

                if (signatures.length === 0) {
                    return [];
                }

                // Fetch full parsed transactions
                const parsedTxs = await this.connection.getParsedTransactions(signatures, {
                    maxSupportedTransactionVersion: 0,
                });

                // Filter out nulls (failed lookups)
                return parsedTxs.filter((tx): tx is ParsedTransactionWithMeta => tx !== null);

            } catch (error: any) {
                console.error(`Error fetching transactions (Attempt ${retries + 1}/${maxRetries}):`, error.message);

                if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
                    // Exponential backoff
                    const delay = Math.pow(2, retries) * 1000;
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    retries++;
                } else {
                    throw error;
                }
            }
        }

        throw new Error(`Failed to fetch transactions for ${address} after ${maxRetries} attempts`);
    }
}
