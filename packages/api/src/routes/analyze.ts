import { Hono } from 'hono';
import { PublicKey, Connection } from '@solana/web3.js';
import { HeliusClient } from '../services/helius';
import { DrainerDetector, DetectionResult } from '../services/detector';
import { RiskAggregator } from '../services/risk-aggregator';
import { AnchorClient } from '../services/anchor-client';
import { getDomainsForAddress } from '../services/drainer-data';

const app = new Hono();

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/analyze', async (c) => {
  const address = c.req.query('address');
  const limitParam = c.req.query('limit');
  const includeExperimental = c.req.query('experimental') === 'true';
  const limit = limitParam ? Math.min(Number(limitParam) || 50, 200) : 50;

  if (!address) {
    return c.json({ success: false, error: 'Address is required', timestamp: Date.now() }, 400);
  }

  try {
    new PublicKey(address);
  } catch (_err) {
    return c.json({ success: false, error: 'Invalid Solana address', timestamp: Date.now() }, 400);
  }

  const heliusKey = process.env.HELIUS_API_KEY;
  if (!heliusKey) {
    return c.json({ success: false, error: 'HELIUS_API_KEY is not configured', timestamp: Date.now() }, 500);
  }

  // Determine network from env or default to devnet for safety
  const network = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet';

  try {
    const heliusClient = new HeliusClient(heliusKey, network);
    const transactions = await heliusClient.getTransactionsForAddress(address, { limit });

    // Initialize Anchor client for known drainer checks
    const rpcUrl = network === 'mainnet' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const anchorClient = new AnchorClient(connection, process.env.ANCHOR_WALLET);

    const detections: DetectionResult[] = [];

    for (const tx of transactions) {
      const setAuthority = DrainerDetector.detectSetAuthority(tx);
      if (setAuthority) detections.push(setAuthority);

      const unlimitedApproval = DrainerDetector.detectUnlimitedApproval(tx);
      if (unlimitedApproval) detections.push(unlimitedApproval);

      // Check against on-chain drainer registry
      const known = await DrainerDetector.detectKnownDrainer(
        tx, 
        async (addr: string) => await anchorClient.isKnownDrainer(addr),
        getDomainsForAddress // Pass function to get domains
      );
      if (known) detections.push(known);
    }

    const report = RiskAggregator.aggregateRisk(detections, {
      walletAddress: address,
      transactionCount: transactions.length,
      transactions: transactions, // Pass transactions for asset extraction
      includeExperimental: includeExperimental, // Pass experimental flag
    });

    return c.json({
      success: true,
      data: report,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Analyze error:', err?.message || err);
    return c.json(
      {
        success: false,
        error: 'Failed to analyze wallet',
        details: err?.message,
        timestamp: Date.now(),
      },
      500
    );
  }
});

export default app;

