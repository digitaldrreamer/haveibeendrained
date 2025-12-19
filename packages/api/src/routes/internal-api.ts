import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { PublicKey, Connection } from '@solana/web3.js';
import { HTTPException } from 'hono/http-exception';
import { AnchorClient } from '../services/anchor-client';
import { analyzeWallet } from '../services/wallet-analysis';
import { cacheMiddleware } from '../middleware/cache';

const app = new Hono().basePath('/api/internal');

// Query parameter validation schema
const checkQuerySchema = z.object({
  address: z.string().min(32).max(44),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  experimental: z.coerce.boolean().optional().default(false),
});

const analyzeQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  experimental: z.coerce.boolean().optional().default(false),
});

/**
 * GET /api/internal/check - Unified endpoint for checking drainer addresses and wallet security
 * 
 * Internal version - NO rate limiting, CORS-protected
 * Same functionality as /api/v1/check but for frontend use
 * 
 * Flow:
 * 1. Check if address is a known drainer (on-chain registry)
 * 2. If not a drainer, perform full wallet analysis
 */
app.get('/check',
  cacheMiddleware(),                     // Check cache for performance
  zValidator('query', checkQuerySchema), // Validate query parameters
  async (c) => {
    const { address, limit, experimental } = c.req.valid('query');

    // Validate Solana address format
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address);
    } catch (_err) {
      throw new HTTPException(400, {
        message: 'Invalid Solana address',
      });
    }

    // Determine network from env or default to devnet for safety
    const network = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet';
    const rpcUrl = network === 'mainnet' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const anchorClient = new AnchorClient(connection, process.env.ANCHOR_WALLET);

    // Step 1: Check if address is a known drainer
    const drainerReport = await anchorClient.getDrainerReport(publicKey);

    if (drainerReport && drainerReport.reportCount > 0) {
      // Return drainer report immediately
      return c.json({
        success: true,
        type: 'drainer',
        data: {
          drainerAddress: drainerReport.drainerAddress.toString(),
          reportCount: drainerReport.reportCount,
          firstSeen: new Date(drainerReport.firstSeen * 1000).toISOString(),
          lastSeen: new Date(drainerReport.lastSeen * 1000).toISOString(),
          totalSolReported: drainerReport.totalSolReported / 1e9, // Convert lamports to SOL
          recentReporters: drainerReport.recentReporters.map(r => r.toString()),
        },
        timestamp: Date.now(),
      });
    }

    // Step 2: Perform full wallet analysis (includes demo mode check)
    try {
      const report = await analyzeWallet(address, {
        limit,
        includeExperimental: experimental,
        network,
      });

      return c.json({
        success: true,
        type: 'wallet_analysis',
        data: report,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error('Wallet analysis error:', err?.message || err);
      throw new HTTPException(500, {
        message: 'Failed to analyze wallet',
        cause: err,
      });
    }
  }
);

/**
 * GET /api/internal/drainer/:address - Check only if address is a known drainer (faster)
 * Internal version - NO rate limiting, CORS-protected
 */
app.get('/drainer/:address',
  cacheMiddleware(),
  async (c) => {
    const address = c.req.param('address');

    // Validate Solana address
    try {
      new PublicKey(address);
    } catch (_err) {
      throw new HTTPException(400, {
        message: 'Invalid Solana address',
      });
    }

    const network = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet';
    const rpcUrl = network === 'mainnet' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const anchorClient = new AnchorClient(connection, process.env.ANCHOR_WALLET);

    const drainerReport = await anchorClient.getDrainerReport(address);

    if (!drainerReport || drainerReport.reportCount === 0) {
      return c.json({
        success: true,
        type: 'drainer',
        data: null,
        message: 'No reports found for this address',
        timestamp: Date.now(),
      });
    }

    return c.json({
      success: true,
      type: 'drainer',
      data: {
        drainerAddress: drainerReport.drainerAddress.toString(),
        reportCount: drainerReport.reportCount,
        firstSeen: new Date(drainerReport.firstSeen * 1000).toISOString(),
        lastSeen: new Date(drainerReport.lastSeen * 1000).toISOString(),
        totalSolReported: drainerReport.totalSolReported / 1e9,
        recentReporters: drainerReport.recentReporters.map(r => r.toString()),
      },
      timestamp: Date.now(),
    });
  }
);

/**
 * GET /api/internal/analyze/:address - Perform full wallet analysis only (skip drainer check)
 * Internal version - NO rate limiting, CORS-protected
 */
app.get('/analyze/:address',
  cacheMiddleware(),
  zValidator('query', analyzeQuerySchema),
  async (c) => {
    const address = c.req.param('address');
    const { limit = 50, experimental = false } = c.req.valid('query');

    // Validate Solana address
    try {
      new PublicKey(address);
    } catch (_err) {
      throw new HTTPException(400, {
        message: 'Invalid Solana address',
      });
    }

    const network = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet';

    try {
      const report = await analyzeWallet(address, {
        limit,
        includeExperimental: experimental,
        network,
      });

      return c.json({
        success: true,
        type: 'wallet_analysis',
        data: report,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error('Wallet analysis error:', err?.message || err);
      throw new HTTPException(500, {
        message: 'Failed to analyze wallet',
        cause: err,
      });
    }
  }
);

// Error handling
app.onError((err, c) => {
  console.error('Internal API Error:', err);

  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  return c.json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: Date.now(),
  }, 500);
});

export default app;

