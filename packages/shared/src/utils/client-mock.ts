import type { RiskReport, DetectionResult } from '../types';

/**
 * Client-side mock utility
 * Provides predefined test data for specific wallet addresses
 * Works in browser/extension environments without server dependencies
 */

/**
 * Generate a valid-looking base58 transaction signature (88 characters)
 * Solana signatures are base58 encoded, exactly 88 characters
 */
function generateMockSignature(seed: string): string {
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

/**
 * Demo wallet configuration
 */
interface DemoWallet {
  address: string;
  riskScore: number;
  severity: 'SAFE' | 'AT_RISK' | 'DRAINED';
  detections: DetectionResult[];
  recommendations: string[];
  transactionCount: number;
  affectedAssets: {
    tokens: string[];
    nfts: string[];
    sol: number;
  };
}

// Demo wallet definitions (same as server-side)
const DEMO_WALLETS: Record<string, DemoWallet> = {
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
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU': {
    address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    riskScore: 65,
    severity: 'AT_RISK',
    transactionCount: 12,
    detections: [
      {
        type: 'UNLIMITED_APPROVAL',
        severity: 'HIGH',
        confidence: 90,
        affectedAccounts: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
        suspiciousRecipients: ['5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'],
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
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM': {
    address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    riskScore: 95,
    severity: 'DRAINED',
    transactionCount: 8,
    detections: [
      {
        type: 'SET_AUTHORITY',
        severity: 'CRITICAL',
        confidence: 95,
        affectedAccounts: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
        suspiciousRecipients: ['9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'],
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
        suspiciousRecipients: ['9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'],
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
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1': {
    address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
    riskScore: 85,
    severity: 'AT_RISK',
    transactionCount: 15,
    detections: [
      {
        type: 'KNOWN_DRAINER',
        severity: 'CRITICAL',
        confidence: 100,
        affectedAccounts: [],
        suspiciousRecipients: ['5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'],
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
function demoWalletToRiskReport(demo: DemoWallet): RiskReport {
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
export function isMockAddress(address: string): boolean {
  return address in DEMO_WALLETS;
}

/**
 * Get mock wallet data if address matches a demo wallet
 * @param address - Wallet address to check
 * @param simulateLoading - If true, adds a delay to simulate API call (default: true)
 * @returns Promise resolving to RiskReport or null if not a mock address
 */
export async function getMockWalletData(
  address: string,
  simulateLoading: boolean = true
): Promise<RiskReport | null> {
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

/**
 * Get all mock wallet addresses (for testing/reference)
 */
export function getAllMockAddresses(): string[] {
  return Object.keys(DEMO_WALLETS);
}

