import { Hono } from 'hono';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { AnchorClient } from '../services/anchor-client';
import { z } from 'zod';

const app = new Hono();

// Validation schema
const reportSchema = z.object({
  drainerAddress: z.string(),
  amountStolen: z.number().optional(),
  // For MVP, we'll accept a signed transaction or use server wallet
  // In production, this would be handled client-side with wallet adapter
});

/**
 * GET /api/report/:address - Get drainer report from on-chain registry
 */
app.get('/api/report/:address', async (c) => {
  const address = c.req.param('address');

  try {
    new PublicKey(address);
  } catch (_err) {
    return c.json({ success: false, error: 'Invalid Solana address', timestamp: Date.now() }, 400);
  }

  try {
    const network = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet';
    const rpcUrl = network === 'mainnet' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const anchorClient = new AnchorClient(connection, process.env.ANCHOR_WALLET);

    const report = await anchorClient.getDrainerReport(address);

    if (!report) {
      return c.json({
        success: true,
        data: null,
        message: 'No reports found for this address',
        timestamp: Date.now(),
      });
    }

    return c.json({
      success: true,
      data: {
        drainerAddress: report.drainerAddress.toString(),
        reportCount: report.reportCount,
        firstSeen: new Date(report.firstSeen * 1000).toISOString(),
        lastSeen: new Date(report.lastSeen * 1000).toISOString(),
        totalSolReported: report.totalSolReported / 1e9, // Convert lamports to SOL
        recentReporters: report.recentReporters.map(r => r.toString()),
      },
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Report fetch error:', err?.message || err);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch drainer report',
        details: err?.message,
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * POST /api/report - Submit a drainer report to on-chain registry
 * 
 * Note: For MVP, this uses the server wallet. In production, this should
 * be handled client-side with wallet adapter for user signatures.
 */
app.post('/api/report', async (c) => {
  try {
    const body = await c.req.json();
    const validated = reportSchema.parse(body);

    try {
      new PublicKey(validated.drainerAddress);
    } catch (_err) {
      return c.json({ success: false, error: 'Invalid drainer address', timestamp: Date.now() }, 400);
    }

    // Check if wallet is configured
    if (!process.env.ANCHOR_WALLET) {
      return c.json({
        success: false,
        error: 'Server wallet not configured. Reports must be submitted client-side.',
        timestamp: Date.now(),
      }, 500);
    }

    const network = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet';
    const rpcUrl = network === 'mainnet' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const anchorClient = new AnchorClient(connection, process.env.ANCHOR_WALLET);

    // Convert SOL to lamports if amount provided
    const amountStolenLamports = validated.amountStolen 
      ? Math.floor(validated.amountStolen * 1e9)
      : undefined;

    const txSignature = await anchorClient.reportDrainer(
      validated.drainerAddress,
      amountStolenLamports
    );

    return c.json({
      success: true,
      data: {
        transactionSignature: txSignature,
        drainerAddress: validated.drainerAddress,
        explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=${network}`,
      },
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Report submission error:', err?.message || err);
    
    // Handle Anchor-specific errors
    if (err?.message?.includes('Insufficient funds')) {
      return c.json({
        success: false,
        error: 'Insufficient funds for anti-spam fee (0.01 SOL required)',
        timestamp: Date.now(),
      }, 400);
    }

    if (err?.message?.includes('Cannot report yourself')) {
      return c.json({
        success: false,
        error: 'Cannot report yourself as a drainer',
        timestamp: Date.now(),
      }, 400);
    }

    return c.json(
      {
        success: false,
        error: 'Failed to submit drainer report',
        details: err?.message,
        timestamp: Date.now(),
      },
      500
    );
  }
});

export default app;

