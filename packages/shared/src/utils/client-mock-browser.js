/**
 * Client-side mock utility (Browser-compatible version)
 * Provides predefined test data for specific wallet addresses
 * Works in browser/extension environments without server dependencies
 * 
 * This is a standalone JavaScript file that can be included in HTML/extension contexts
 */

(function () {
    'use strict';

    /**
     * Generate a valid-looking base58 transaction signature (88 characters)
     */
    function generateMockSignature(seed) {
        const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }

        let result = '';
        let num = Math.abs(hash);
        for (let i = 0; i < 88; i++) {
            result += base58[num % base58.length];
            num = Math.floor(num / base58.length);
        }
        return result;
    }

    // Demo wallet definitions
    const DEMO_WALLETS = {
        // Safe wallet - System Program (valid Solana address)
        '11111111111111111111111111111111': {
            address: '11111111111111111111111111111111',
            riskScore: 0,
            severity: 'SAFE',
            transactionCount: 5,
            detections: [],
            recommendations: [
                '✅ Your wallet appears safe',
                'Continue monitoring transactions',
                'Keep your private keys secure',
            ],
            affectedAssets: {
                tokens: [],
                nfts: [],
                sol: 0,
            },
        },

        // At-risk wallet (unlimited approvals)
        'ATRISK1111111111111111111111111111111': {
            address: 'ATRISK1111111111111111111111111111111',
            riskScore: 65,
            severity: 'AT_RISK',
            transactionCount: 12,
            detections: [
                {
                    type: 'UNLIMITED_APPROVAL',
                    severity: 'HIGH',
                    confidence: 90,
                    affectedAccounts: ['TokenAccount1111111111111111111111111'],
                    suspiciousRecipients: ['DrainerAddress111111111111111111111111'],
                    recommendations: [
                        '⚠️ Revoke unlimited approvals immediately',
                        'Check token approvals in your wallet',
                        'Consider using a new wallet for future transactions',
                    ],
                    timestamp: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
                    signature: generateMockSignature('unlimited-approval-tx'),
                },
            ],
            recommendations: [
                '⚠️ Revoke unlimited approvals immediately',
                'Check token approvals in your wallet',
                'Consider using a new wallet for future transactions',
            ],
            affectedAssets: {
                tokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'], // USDC
                nfts: [],
                sol: 0.5,
            },
        },

        // Drained wallet (SetAuthority attack + known drainer)
        'DRAINED111111111111111111111111111111': {
            address: 'DRAINED111111111111111111111111111111',
            riskScore: 95,
            severity: 'DRAINED',
            transactionCount: 8,
            detections: [
                {
                    type: 'SET_AUTHORITY',
                    severity: 'CRITICAL',
                    confidence: 95,
                    affectedAccounts: ['TokenAccount2222222222222222222222222'],
                    suspiciousRecipients: ['DrainerAddress222222222222222222222222'],
                    recommendations: [
                        '🚨 CRITICAL: Account ownership transferred',
                        'Your token account ownership has been transferred',
                        'You have likely lost control of these assets',
                    ],
                    timestamp: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
                    signature: generateMockSignature('set-authority-tx'),
                },
                {
                    type: 'KNOWN_DRAINER',
                    severity: 'CRITICAL',
                    confidence: 100,
                    affectedAccounts: [],
                    suspiciousRecipients: ['DrainerAddress222222222222222222222222'],
                    domains: ['malicious-drainer.com'],
                    recommendations: [
                        '🚨 CRITICAL: Interacted with known drainer',
                        'This address is in our on-chain registry',
                        'Your wallet has been compromised',
                    ],
                    timestamp: Math.floor(Date.now() / 1000) - 172800,
                    signature: generateMockSignature('known-drainer-tx'),
                },
            ],
            recommendations: [
                '🚨 CRITICAL: Your wallet has been compromised',
                'Do not use this wallet anymore',
                'Create a new wallet immediately',
                'Report the drainer address',
            ],
            affectedAssets: {
                tokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'So11111111111111111111111111111111111111112'],
                nfts: ['NFT1111111111111111111111111111111111111111'],
                sol: 2.5,
            },
        },

        // Known drainer interaction
        'DRAINER111111111111111111111111111111': {
            address: 'DRAINER111111111111111111111111111111',
            riskScore: 85,
            severity: 'AT_RISK',
            transactionCount: 15,
            detections: [
                {
                    type: 'KNOWN_DRAINER',
                    severity: 'CRITICAL',
                    confidence: 100,
                    affectedAccounts: [],
                    suspiciousRecipients: ['DrainerAddress333333333333333333333333'],
                    domains: ['phishing-site.com', 'fake-solana-wallet.com'],
                    recommendations: [
                        '🚨 CRITICAL: Interacted with known drainer',
                        'This address is in our on-chain registry',
                        'Revoke all approvals immediately',
                    ],
                    timestamp: Math.floor(Date.now() / 1000) - 259200, // 3 days ago
                    signature: generateMockSignature('drainer-interaction-tx'),
                },
            ],
            recommendations: [
                '⚠️ You interacted with a known drainer',
                'Revoke all approvals immediately',
                'Monitor your wallet for suspicious activity',
                'Consider creating a new wallet',
            ],
            affectedAssets: {
                tokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
                nfts: [],
                sol: 0.1,
            },
        },
    };

    /**
     * Convert demo wallet to RiskReport format
     */
    function demoWalletToRiskReport(demo) {
        return {
            overallRisk: demo.riskScore,
            severity: demo.severity,
            detections: demo.detections,
            recommendations: demo.recommendations,
            walletAddress: demo.address,
            transactionCount: demo.transactionCount,
            affectedAssets: demo.affectedAssets,
            analyzedAt: Date.now(),
        };
    }

    /**
     * Check if an address is a mock/demo address
     */
    function isMockAddress(address) {
        return address in DEMO_WALLETS;
    }

    /**
     * Get mock wallet data if address matches a demo wallet
     * @param {string} address - Wallet address to check
     * @param {boolean} simulateLoading - If true, adds a delay to simulate API call (default: true)
     * @returns {Promise<Object|null>} Promise resolving to RiskReport or null if not a mock address
     */
    async function getMockWalletData(address, simulateLoading = true) {
        const demoWallet = DEMO_WALLETS[address];
        if (!demoWallet) {
            return null;
        }

        // Simulate loading delay (1-2 seconds)
        if (simulateLoading) {
            const delay = 1000 + Math.random() * 1000; // 1-2 seconds
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        return demoWalletToRiskReport(demoWallet);
    }

    // Export to global scope for browser/extension use
    if (typeof window !== 'undefined') {
        window.ClientMock = {
            isMockAddress: isMockAddress,
            getMockWalletData: getMockWalletData,
            getAllMockAddresses: function () { return Object.keys(DEMO_WALLETS); }
        };
    }

    // Export for Node.js/CommonJS environments
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            isMockAddress: isMockAddress,
            getMockWalletData: getMockWalletData,
            getAllMockAddresses: function () { return Object.keys(DEMO_WALLETS); }
        };
    }
})();

