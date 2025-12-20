import { PublicKey, Connection } from '@solana/web3.js';
import { HeliusClient } from './helius';
import { DrainerDetector, DetectionResult } from './detector';
import { RiskAggregator, RiskReport } from './risk-aggregator';
import { AnchorClient } from './anchor-client';
import { getDomainsForAddress } from './drainer-data';
import { getDemoWallet, demoWalletToRiskReport, isDemoMode } from './demo-mode';
import { sendWalletDrainAlerts } from './wallet-alert-service.js';

/**
 * Options for wallet analysis
 */
export interface AnalysisOptions {
  limit?: number;
  includeExperimental?: boolean;
  network?: 'mainnet' | 'devnet';
}

/**
 * Shared wallet analysis function used by all endpoints
 * Checks demo mode first, then performs real analysis
 * 
 * This ensures demo mode works consistently across:
 * - /api/analyze
 * - /api/internal/check
 * - /api/internal/analyze
 * - /api/v1/check
 * - /api/v1/analyze
 * - /api/actions/check (Solana Actions/Blinks)
 */
export async function analyzeWallet(
  address: string,
  options: AnalysisOptions = {}
): Promise<RiskReport> {
  const {
    limit = 50,
    includeExperimental = false,
    network = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet',
  } = options;

  // Check demo mode first (before any external API calls)
  const demoWallet = getDemoWallet(address);
  if (demoWallet) {
    return demoWalletToRiskReport(demoWallet);
  }

  // Real analysis - requires Helius API key
  const heliusKey = process.env.HELIUS_API_KEY;
  if (!heliusKey) {
    throw new Error('HELIUS_API_KEY is not configured');
  }

  // Initialize clients
  const heliusClient = new HeliusClient(heliusKey, network);
  const rpcUrl = network === 'mainnet' 
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  const anchorClient = new AnchorClient(connection, process.env.ANCHOR_WALLET);

  // * Check if the address itself is a known drainer
  // * This is critical - if someone checks a drainer address, we should detect it
  const drainerReport = await anchorClient.getDrainerReport(address);
  if (drainerReport && drainerReport.reportCount > 0) {
    // Create a critical detection for the address being a drainer itself
    const drainerDetection: DetectionResult = {
      type: 'KNOWN_DRAINER',
      severity: 'CRITICAL',
      confidence: 100,
      affectedAccounts: [],
      suspiciousRecipients: [address],
      recommendations: [
        '🚨 CRITICAL: This address is a known drainer',
        `This address has ${drainerReport.reportCount} report(s) in our on-chain registry`,
        `Total SOL reported stolen: ${(drainerReport.totalSolReported / 1e9).toFixed(4)} SOL`,
        'DO NOT interact with this address',
        'DO NOT approve any transactions from this address',
      ],
      timestamp: drainerReport.lastSeen,
      drainerAddress: address,
    };

    // Return a critical risk report
    return {
      overallRisk: 100,
      severity: 'DRAINED',
      detections: [drainerDetection],
      recommendations: [
        '🚨 CRITICAL: This address is a known drainer',
        'DO NOT interact with this address under any circumstances',
        'DO NOT approve any transactions from this address',
        'Report any suspicious activity involving this address',
      ],
      walletAddress: address,
      transactionCount: 0,
      affectedAssets: {
        tokens: [],
        nfts: [],
        sol: drainerReport.totalSolReported / 1e9,
      },
      analyzedAt: Date.now(),
    };
  }

  // Fetch transactions
  const transactions = await heliusClient.getTransactionsForAddress(address, { limit });

  // Run detection algorithms
  const detections: DetectionResult[] = [];

  for (const tx of transactions) {
    const setAuthority = DrainerDetector.detectSetAuthority(tx);
    if (setAuthority) detections.push(setAuthority);

    const unlimitedApproval = DrainerDetector.detectUnlimitedApproval(tx);
    if (unlimitedApproval) detections.push(unlimitedApproval);

    // Check against on-chain drainer registry (includes demo mode check)
    const known = await DrainerDetector.detectKnownDrainer(
      tx,
      async (addr: string) => await anchorClient.isKnownDrainer(addr),
      getDomainsForAddress
    );
    if (known) detections.push(known);
  }

  // Aggregate risk
  const riskReport = RiskAggregator.aggregateRisk(detections, {
    walletAddress: address,
    transactionCount: transactions.length,
    transactions: transactions,
    includeExperimental,
  });

  // Send email alerts if drain detected (severity is DRAINED or high risk AT_RISK)
  if (riskReport.severity === 'DRAINED' || (riskReport.severity === 'AT_RISK' && riskReport.overallRisk >= 70)) {
    // Extract drainer address from detections if available
    const drainerDetection = detections.find(
      (d) => d.type === 'KNOWN_DRAINER' && d.drainerAddress
    );
    const drainerAddress = drainerDetection?.drainerAddress;

    // Send alerts asynchronously (don't block the response)
    sendWalletDrainAlerts(address, {
      drainerAddress,
      riskScore: riskReport.overallRisk,
    }).catch((error) => {
      // Log but don't throw - email alerts are non-critical
      console.error(`Failed to send wallet drain alerts for ${address}:`, error);
    });
  }

  return riskReport;
}

