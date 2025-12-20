import { PublicKey } from '@solana/web3.js';
import type { DetectionResult } from './detector';
import type { RiskReport } from './risk-aggregator';
import type { DrainerReport } from './anchor-client';

/**
 * Demo Mode Service
 * Provides predefined test data for specific wallet addresses in demo mode
 * No frontend indicators - demo data is indistinguishable from real data
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
export interface DemoWallet {
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

/**
 * Demo drainer report configuration
 */
export interface DemoDrainerReport {
  drainerAddress: PublicKey;
  reportCount: number;
  firstSeen: number;
  lastSeen: number;
  totalSolReported: number;
  recentReporters: PublicKey[];
}

// Demo wallet definitions
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

// Demo drainer addresses (addresses that should return drainer reports)
// These addresses are marked as drainers themselves
const DEMO_DRAINER_ADDRESSES = [
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Drained wallet (also a drainer)
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', // Known drainer interaction (also a drainer)
];

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
}

/**
 * Get demo wallet data if address matches a demo wallet
 */
export function getDemoWallet(address: string): DemoWallet | null {
  if (!isDemoMode()) return null;
  return DEMO_WALLETS[address] || null;
}

/**
 * Get demo drainer report if address matches a demo drainer
 */
export function getDemoDrainerReport(address: string | PublicKey): DrainerReport | null {
  if (!isDemoMode()) return null;
  
  const addressStr = typeof address === 'string' ? address : address.toString();
  
  if (!DEMO_DRAINER_ADDRESSES.includes(addressStr)) {
    return null;
  }
  
  // Return mock drainer report data
  const pubkey = typeof address === 'string' ? new PublicKey(address) : address;
  const now = Math.floor(Date.now() / 1000);
  
  return {
    drainerAddress: pubkey,
    reportCount: addressStr === '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' ? 5 : 3,
    firstSeen: now - 604800, // 7 days ago
    lastSeen: now - 86400, // 1 day ago
    totalSolReported: addressStr === '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' ? 2.5e9 : 1.2e9, // In lamports
    recentReporters: [
      new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      new PublicKey('11111111111111111111111111111111'),
    ],
  };
}

/**
 * Check if an address is a demo drainer address
 */
export function isDemoDrainerAddress(address: string | PublicKey): boolean {
  if (!isDemoMode()) return false;
  const addressStr = typeof address === 'string' ? address : address.toString();
  return DEMO_DRAINER_ADDRESSES.includes(addressStr);
}

/**
 * Convert demo wallet to RiskReport format
 */
export function demoWalletToRiskReport(demo: DemoWallet): RiskReport {
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
 * Get all demo wallet addresses (for testing/reference)
 */
export function getAllDemoWalletAddresses(): string[] {
  return Object.keys(DEMO_WALLETS);
}

