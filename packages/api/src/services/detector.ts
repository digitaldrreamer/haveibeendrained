import { ParsedTransactionWithMeta, Partials, ParsedInstruction } from '@solana/web3.js';

export interface DetectionResult {
    type: 'SET_AUTHORITY' | 'UNLIMITED_APPROVAL' | 'KNOWN_DRAINER' | 'SOL_TRANSFER';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    confidence: number; // 0-100
    affectedAccounts: string[];
    suspiciousRecipients: string[];
    domains?: string[]; // Associated domains from reports
    recommendations: string[];
    timestamp: number;
    signature: string;
}

export class DrainerDetector {
    /**
     * Detect SetAuthority instructions that change account ownership
     * This is a common method used by drainers to take full control of token accounts
     */
    static detectSetAuthority(tx: ParsedTransactionWithMeta): DetectionResult | null {
        if (!tx.meta || !tx.transaction) return null;

        const instructions = tx.transaction.message.instructions;
        const suspiciousRecipients: string[] = [];
        const affectedAccounts: string[] = [];
        let isSetAuthority = false;

        for (const ix of instructions) {
            // Check for Token Program instructions
            if (ix.program === 'spl-token' && 'parsed' in ix) {
                const parsed = (ix as ParsedInstruction).parsed;

                if (parsed.type === 'setAuthority') {
                    const info = parsed.info;

                    // We are specifically looking for AccountOwner authority changes
                    // This gives full control of the token account to the new authority
                    if (info.authorityType === 'accountOwner' && info.newAuthority) {
                        isSetAuthority = true;
                        suspiciousRecipients.push(info.newAuthority);
                        affectedAccounts.push(info.account);
                    }
                }
            }
        }

        if (isSetAuthority) {
            return {
                type: 'SET_AUTHORITY',
                severity: 'CRITICAL',
                confidence: 95,
                affectedAccounts: [...new Set(affectedAccounts)],
                suspiciousRecipients: [...new Set(suspiciousRecipients)],
                recommendations: [
                    '🚨 CRITICAL: Account ownership transfer detected!',
                    'Your token account ownership has been transferred to another wallet.',
                    'You have likely lost control of these assets.',
                    'Revoke any pending approvals immediately if possible.',
                ],
                timestamp: tx.blockTime || 0,
                signature: tx.transaction.signatures[0],
            };
        }

        return null;
    }

    /**
     * Detect Unlimited Approval (Approve with max u64 amount)
     * This allows a spender to drain all tokens from the account at any time
     */
    static detectUnlimitedApproval(tx: ParsedTransactionWithMeta): DetectionResult | null {
        if (!tx.meta || !tx.transaction) return null;

        const instructions = tx.transaction.message.instructions;
        let isUnlimitedApproval = false;
        const suspiciousRecipients: string[] = [];
        const affectedAccounts: string[] = [];

        for (const ix of instructions) {
            if (ix.program === 'spl-token' && 'parsed' in ix) {
                const parsed = (ix as ParsedInstruction).parsed;

                if (parsed.type === 'approve') {
                    const info = parsed.info;
                    const amount = info.amount;

                    // Check for u64::MAX or very large numbers often used for "unlimited"
                    // u64::MAX is 18446744073709551615
                    if (amount === '18446744073709551615' || amount === '18446744073709551616') {
                        isUnlimitedApproval = true;
                        suspiciousRecipients.push(info.delegate);
                        affectedAccounts.push(info.source);
                    }
                }
            }
        }

        if (isUnlimitedApproval) {
            return {
                type: 'UNLIMITED_APPROVAL',
                severity: 'HIGH',
                confidence: 90,
                affectedAccounts: [...new Set(affectedAccounts)],
                suspiciousRecipients: [...new Set(suspiciousRecipients)],
                recommendations: [
                    '⚠️ HIGH RISK: Unlimited Token Approval Detected',
                    'You have approved a wallet to spend ALL your tokens.',
                    'If you did not intend to do this, revoke the approval immediately.',
                    'Use a tool like SolRevoke to check and revoke active approvals.',
                ],
                timestamp: tx.blockTime || 0,
                signature: tx.transaction.signatures[0],
            };
        }

        return null;
    }

    /**
     * Detect Known Drainer
     * Checks if any of the transaction recipients are in our database of known drainer addresses
     */
    static async detectKnownDrainer(
        tx: ParsedTransactionWithMeta,
        checkDrainer: (address: string) => Promise<boolean>,
        getDomains?: (address: string) => Promise<string[]>
    ): Promise<DetectionResult | null> {
        if (!tx.meta || !tx.transaction) return null;

        const message = tx.transaction.message;
        const accountKeys = message.accountKeys.map(k => k.pubkey.toString());
        const suspiciousRecipients: string[] = [];
        const allDomains: string[] = [];

        // A simpler approach: Check all accounts that are NOT the fee payer
        const feePayer = message.accountKeys[0].pubkey.toString();

        for (const address of accountKeys) {
            if (address === feePayer) continue; // Skip victim/payer

            if (await checkDrainer(address)) {
                suspiciousRecipients.push(address);
                
                // Get domains for this drainer if function provided
                if (getDomains) {
                    const domains = await getDomains(address);
                    allDomains.push(...domains);
                }
            }
        }

        if (suspiciousRecipients.length > 0) {
            return {
                type: 'KNOWN_DRAINER',
                severity: 'CRITICAL',
                confidence: 100,
                affectedAccounts: [feePayer], // Assuming fee payer is the victim
                suspiciousRecipients: [...new Set(suspiciousRecipients)],
                domains: [...new Set(allDomains)], // Unique domains
                recommendations: [
                    '🚨 CRITICAL: Interaction with Known Drainer Detected!',
                    'This transaction involves a wallet address flagged as a malicious drainer.',
                    'Do NOT sign this transaction if you haven\'t already.',
                    'If signed, revoke all approvals and move assets immediately.',
                ],
                timestamp: tx.blockTime || 0,
                signature: tx.transaction.signatures[0],
            };
        }

        return null;
    }
}
