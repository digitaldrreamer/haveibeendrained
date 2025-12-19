import { Hono } from 'hono';
import { PublicKey } from '@solana/web3.js';
import { analyzeWallet } from '../services/wallet-analysis';

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

  try {
    const report = await analyzeWallet(address, {
      limit,
      includeExperimental,
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

