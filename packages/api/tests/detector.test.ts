import { DrainerDetector } from '../src/services/detector';
import { describe, it, expect } from 'bun:test';
import { ParsedTransactionWithMeta } from '@solana/web3.js';

describe('DrainerDetector', () => {
    it('should detect SetAuthority accountOwner changes', () => {
        // Mock transaction with SetAuthority instruction
        const mockTx: any = {
            blockTime: 1234567890,
            transaction: {
                signatures: ['test-signature'],
                message: {
                    instructions: [
                        {
                            program: 'spl-token',
                            parsed: {
                                type: 'setAuthority',
                                info: {
                                    authorityType: 'accountOwner',
                                    newAuthority: 'suspicious-wallet',
                                    account: 'victim-token-account',
                                },
                            },
                        },
                    ],
                },
            },
            meta: {},
        };

        const result = DrainerDetector.detectSetAuthority(mockTx);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('SET_AUTHORITY');
        expect(result?.severity).toBe('CRITICAL');
        expect(result?.suspiciousRecipients).toContain('suspicious-wallet');
        expect(result?.affectedAccounts).toContain('victim-token-account');
    });

    it('should ignore SetAuthority for other types (e.g. CloseAuthority)', () => {
        const mockTx: any = {
            blockTime: 1234567890,
            transaction: {
                signatures: ['test-signature'],
                message: {
                    instructions: [
                        {
                            program: 'spl-token',
                            parsed: {
                                type: 'setAuthority',
                                info: {
                                    authorityType: 'closeAuthority', // Not accountOwner
                                    newAuthority: 'some-wallet',
                                    account: 'token-account',
                                },
                            },
                        },
                    ],
                },
            },
            meta: {},
        };

        const result = DrainerDetector.detectSetAuthority(mockTx);
        expect(result).toBeNull();
    });

    it('should detect Unlimited Approval (u64::MAX)', () => {
        const mockTx: any = {
            blockTime: 1234567890,
            transaction: {
                signatures: ['test-signature'],
                message: {
                    instructions: [
                        {
                            program: 'spl-token',
                            parsed: {
                                type: 'approve',
                                info: {
                                    amount: '18446744073709551615', // u64::MAX
                                    delegate: 'spender-wallet',
                                    source: 'victim-token-account',
                                },
                            },
                        },
                    ],
                },
            },
            meta: {},
        };

        const result = DrainerDetector.detectUnlimitedApproval(mockTx);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('UNLIMITED_APPROVAL');
        expect(result?.severity).toBe('HIGH');
        expect(result?.suspiciousRecipients).toContain('spender-wallet');
    });

    it('should ignore normal approvals', () => {
        const mockTx: any = {
            blockTime: 1234567890,
            transaction: {
                signatures: ['test-signature'],
                message: {
                    instructions: [
                        {
                            program: 'spl-token',
                            parsed: {
                                type: 'approve',
                                info: {
                                    amount: '1000000', // Normal amount
                                    delegate: 'spender-wallet',
                                    source: 'victim-token-account',
                                },
                            },
                        },
                    ],
                },
            },
            meta: {},
        };

        const result = DrainerDetector.detectUnlimitedApproval(mockTx);
        expect(result).toBeNull();
    });

    it('should detect Known Drainer interaction', async () => {
        const mockTx: any = {
            blockTime: 1234567890,
            transaction: {
                signatures: ['test-signature'],
                message: {
                    accountKeys: [
                        { pubkey: 'victim-wallet', signer: true, writable: true },
                        { pubkey: 'known-drainer-wallet', signer: false, writable: true },
                    ],
                    instructions: [],
                },
            },
            meta: {},
        };

        const mockCheckDrainer = async (address: string) => {
            return address === 'known-drainer-wallet';
        };

        const result = await DrainerDetector.detectKnownDrainer(mockTx, mockCheckDrainer);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('KNOWN_DRAINER');
        expect(result?.severity).toBe('CRITICAL');
        expect(result?.suspiciousRecipients).toContain('known-drainer-wallet');
    });

    it('should ignore safe addresses', async () => {
        const mockTx: any = {
            blockTime: 1234567890,
            transaction: {
                signatures: ['test-signature'],
                message: {
                    accountKeys: [
                        { pubkey: 'victim-wallet', signer: true, writable: true },
                        { pubkey: 'safe-wallet', signer: false, writable: true },
                    ],
                    instructions: [],
                },
            },
            meta: {},
        };

        const mockCheckDrainer = async (address: string) => {
            return address === 'known-drainer-wallet';
        };

        const result = await DrainerDetector.detectKnownDrainer(mockTx, mockCheckDrainer);
        expect(result).toBeNull();
    });
});
