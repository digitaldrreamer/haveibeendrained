import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { HTTPException } from 'hono/http-exception';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { db } from '../lib/db.js';
import { walletAlerts, nonces } from '../lib/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { emailService } from '../services/email-service.js';
import { buildEmailVerificationEmail, buildWelcomeEmail } from '../services/email-templates.js';
import { randomUUID } from 'crypto';

const app = new Hono().basePath('/api/internal/wallet-alerts');

// Validation schemas
const nonceQuerySchema = z.object({
  walletAddress: z.string().min(32).max(44),
});

const verifyBodySchema = z.object({
  walletAddress: z.string().min(32).max(44),
  signature: z.string(),
  nonce: z.string().uuid(),
  email: z.string().email(),
});

const statusQuerySchema = z.object({
  walletAddress: z.string().min(32).max(44),
});

const disconnectBodySchema = z.object({
  walletAddress: z.string().min(32).max(44),
  signature: z.string(),
  nonce: z.string().uuid(),
});

/**
 * GET /api/internal/wallet-alerts/nonce
 * Generate nonce for wallet address signature verification
 */
app.get(
  '/nonce',
  zValidator('query', nonceQuerySchema),
  async (c) => {
    const { walletAddress } = c.req.valid('query');

    // Validate Solana address
    try {
      new PublicKey(walletAddress);
    } catch (_err) {
      throw new HTTPException(400, {
        message: 'Invalid Solana wallet address',
      });
    }

    // Generate nonce
    const nonce = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store nonce in database
    try {
      await db.insert(nonces).values({
        nonce,
        walletAddress,
        expiresAt,
      });
    } catch (error) {
      console.error('Failed to store nonce:', error);
      throw new HTTPException(500, {
        message: 'Failed to generate nonce',
      });
    }

    return c.json({
      success: true,
      nonce,
      expiresAt: expiresAt.toISOString(),
    });
  }
);

/**
 * POST /api/internal/wallet-alerts/verify
 * Verify Ed25519 signature and create/update wallet alert
 */
app.post(
  '/verify',
  zValidator('json', verifyBodySchema),
  async (c) => {
    const { walletAddress, signature, nonce, email } = c.req.valid('json');

    // Validate Solana address
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(walletAddress);
    } catch (_err) {
      throw new HTTPException(400, {
        message: 'Invalid Solana wallet address',
      });
    }

    // Check nonce exists and not expired
    const storedNonce = await db.query.nonces.findFirst({
      where: and(eq(nonces.nonce, nonce), eq(nonces.walletAddress, walletAddress)),
    });

    if (!storedNonce) {
      throw new HTTPException(400, {
        message: 'Invalid or expired nonce',
      });
    }

    if (new Date(storedNonce.expiresAt) < new Date()) {
      // Clean up expired nonce
      await db.delete(nonces).where(eq(nonces.nonce, nonce));
      throw new HTTPException(400, {
        message: 'Nonce has expired',
      });
    }

    // Decode signature from base58
    let signatureBytes: Uint8Array;
    try {
      signatureBytes = bs58.decode(signature);
    } catch (error) {
      console.error('Signature decode error:', error);
      throw new HTTPException(400, {
        message: 'Invalid signature format',
      });
    }

    // Prepare message bytes
    const messageBytes = new TextEncoder().encode(nonce);
    const publicKeyBytes = publicKey.toBytes();

    // Verify Ed25519 signature
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (!isValid) {
      throw new HTTPException(400, {
        message: 'Invalid signature',
      });
    }

    // Delete used nonce
    await db.delete(nonces).where(eq(nonces.nonce, nonce));

    // Check if wallet alert already exists
    const existingAlert = await db.query.walletAlerts.findFirst({
      where: and(eq(walletAlerts.walletAddress, walletAddress), eq(walletAlerts.email, email)),
    });

    // Generate verification token
    const verificationToken = randomUUID();
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    if (existingAlert) {
      // Update existing alert
      await db
        .update(walletAlerts)
        .set({
          verificationToken,
          verificationTokenExpiresAt,
          verified: false, // Reset verification status
          updatedAt: new Date(),
        })
        .where(eq(walletAlerts.id, existingAlert.id));
    } else {
      // Create new alert
      await db.insert(walletAlerts).values({
        walletAddress,
        email,
        verified: false,
        verificationToken,
        verificationTokenExpiresAt,
      });
    }

    // Send verification email
    try {
      const { subject, html, text } = buildEmailVerificationEmail({
        email,
        verificationToken,
        walletAddress,
        expiresInHours: 24,
      });

      await emailService.sendEmail({
        to: email,
        subject,
        html,
        text,
      });

      // Also send welcome email
      const welcomeEmail = buildWelcomeEmail({ email, walletAddress });
      await emailService.sendEmail({
        to: email,
        subject: welcomeEmail.subject,
        html: welcomeEmail.html,
        text: welcomeEmail.text,
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail the request if email fails
    }

    return c.json({
      success: true,
      requiresEmailVerification: true,
      message: 'Wallet alert registered. Please check your email to verify your address.',
    });
  }
);

/**
 * GET /api/internal/wallet-alerts/status
 * Get wallet alert status
 */
app.get(
  '/status',
  zValidator('query', statusQuerySchema),
  async (c) => {
    const { walletAddress } = c.req.valid('query');

    // Validate Solana address
    try {
      new PublicKey(walletAddress);
    } catch (_err) {
      throw new HTTPException(400, {
        message: 'Invalid Solana wallet address',
      });
    }

    // Find any alert for this wallet
    const alert = await db.query.walletAlerts.findFirst({
      where: eq(walletAlerts.walletAddress, walletAddress),
      orderBy: (alerts, { desc }) => [desc(alerts.createdAt)],
    });

    if (!alert) {
      return c.json({
        exists: false,
        walletAddress,
      });
    }

    return c.json({
      exists: true,
      walletAddress: alert.walletAddress,
      email: alert.email,
      verified: alert.verified,
    });
  }
);

/**
 * POST /api/internal/wallet-alerts/disconnect
 * Remove wallet alert subscription
 */
app.post(
  '/disconnect',
  zValidator('json', disconnectBodySchema),
  async (c) => {
    const { walletAddress, signature, nonce } = c.req.valid('json');

    // Validate Solana address
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(walletAddress);
    } catch (_err) {
      throw new HTTPException(400, {
        message: 'Invalid Solana wallet address',
      });
    }

    // Check nonce exists and not expired
    const storedNonce = await db.query.nonces.findFirst({
      where: and(eq(nonces.nonce, nonce), eq(nonces.walletAddress, walletAddress)),
    });

    if (!storedNonce) {
      throw new HTTPException(400, {
        message: 'Invalid or expired nonce',
      });
    }

    if (new Date(storedNonce.expiresAt) < new Date()) {
      await db.delete(nonces).where(eq(nonces.nonce, nonce));
      throw new HTTPException(400, {
        message: 'Nonce has expired',
      });
    }

    // Decode and verify signature (same as verify endpoint)
    let signatureBytes: Uint8Array;
    try {
      signatureBytes = bs58.decode(signature);
    } catch (error) {
      throw new HTTPException(400, {
        message: 'Invalid signature format',
      });
    }

    const messageBytes = new TextEncoder().encode(nonce);
    const publicKeyBytes = publicKey.toBytes();
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (!isValid) {
      throw new HTTPException(400, {
        message: 'Invalid signature',
      });
    }

    // Delete used nonce
    await db.delete(nonces).where(eq(nonces.nonce, nonce));

    // Delete all alerts for this wallet
    await db.delete(walletAlerts).where(eq(walletAlerts.walletAddress, walletAddress));

    return c.json({
      success: true,
      message: 'Wallet alerts disabled',
    });
  }
);

/**
 * GET /api/internal/wallet-alerts/verify-email/:token
 * Verify email via token link
 */
app.get('/verify-email/:token', async (c) => {
  const token = c.req.param('token');

  if (!token) {
    throw new HTTPException(400, {
      message: 'Verification token is required',
    });
  }

  // Find alert with this token
  const alert = await db.query.walletAlerts.findFirst({
    where: eq(walletAlerts.verificationToken, token),
  });

  if (!alert) {
    throw new HTTPException(404, {
      message: 'Invalid verification token',
    });
  }

  // Check if token expired
  if (alert.verificationTokenExpiresAt && new Date(alert.verificationTokenExpiresAt) < new Date()) {
    throw new HTTPException(400, {
      message: 'Verification token has expired',
    });
  }

  // Mark as verified
  await db
    .update(walletAlerts)
    .set({
      verified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(walletAlerts.id, alert.id));

  return c.json({
    success: true,
    message: 'Email verified successfully. You will now receive wallet security alerts.',
  });
});

// Error handling
app.onError((err, c) => {
  console.error('Wallet Alerts API Error:', err);

  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  return c.json(
    {
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      timestamp: Date.now(),
    },
    500
  );
});

export default app;

