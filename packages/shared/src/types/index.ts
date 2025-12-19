/**
 * Detection result from security analysis
 */
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

/**
 * Affected assets in a security incident
 */
export interface AffectedAssets {
  tokens: string[];
  nfts: string[];
  sol: number;
}

/**
 * Comprehensive risk report for a wallet analysis
 */
export interface RiskReport {
  overallRisk: number; // 0-100
  severity: 'SAFE' | 'AT_RISK' | 'DRAINED';
  detections: DetectionResult[];
  affectedAssets: AffectedAssets;
  recommendations: string[];
  analyzedAt: number;
  walletAddress: string;
  transactionCount: number;
}

/**
 * Wallet analysis summary for quick display
 */
export interface WalletAnalysisSummary {
  address: string;
  riskScore: number;
  severity: 'SAFE' | 'AT_RISK' | 'DRAINED';
  detectionsCount: number;
  lastAnalyzed: number;
}

/**
 * API error response
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: number;
}
