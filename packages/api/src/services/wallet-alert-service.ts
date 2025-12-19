/**
 * Wallet Alert Service
 * Sends email alerts to verified email addresses when wallet drains are detected
 */

import { db } from '../lib/db.js';
import { walletAlerts } from '../lib/schema.js';
import { eq } from 'drizzle-orm';
import { emailService } from './email-service.js';
import { buildDrainAlertEmail } from './email-templates.js';

/**
 * Send drain alert emails to all verified email addresses for a wallet
 * @param walletAddress - Solana wallet address (base58)
 * @param drainInfo - Information about the detected drain
 */
export async function sendWalletDrainAlerts(
  walletAddress: string,
  drainInfo: {
    drainerAddress?: string;
    riskScore?: number;
    transactionHash?: string;
    amountStolen?: string;
  }
): Promise<{ sent: number; failed: number }> {
  try {
    // Find all verified alerts for this wallet
    const alerts = await db.query.walletAlerts.findMany({
      where: eq(walletAlerts.walletAddress, walletAddress),
    });

    // Filter to only verified emails
    const verifiedAlerts = alerts.filter((alert) => alert.verified);

    if (verifiedAlerts.length === 0) {
      console.log(`No verified email alerts found for wallet: ${walletAddress}`);
      return { sent: 0, failed: 0 };
    }

    console.log(`Sending drain alerts to ${verifiedAlerts.length} verified email(s) for wallet: ${walletAddress}`);

    let sent = 0;
    let failed = 0;

    // Send email to each verified address
    for (const alert of verifiedAlerts) {
      try {
        const { subject, html, text } = buildDrainAlertEmail({
          walletAddress,
          drainerAddress: drainInfo.drainerAddress,
          riskScore: drainInfo.riskScore,
        });

        await emailService.sendEmail({
          to: alert.email,
          subject,
          html,
          text,
        });

        sent++;
        console.log(`Drain alert sent to ${alert.email} for wallet ${walletAddress}`);
      } catch (error) {
        failed++;
        console.error(`Failed to send drain alert to ${alert.email}:`, error);
        // Continue with other emails even if one fails
      }
    }

    return { sent, failed };
  } catch (error) {
    console.error(`Error sending wallet drain alerts for ${walletAddress}:`, error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Check if a wallet has any verified email alerts registered
 * @param walletAddress - Solana wallet address (base58)
 * @returns true if wallet has verified alerts, false otherwise
 */
export async function hasVerifiedAlerts(walletAddress: string): Promise<boolean> {
  try {
    const alerts = await db.query.walletAlerts.findMany({
      where: eq(walletAlerts.walletAddress, walletAddress),
    });

    return alerts.some((alert) => alert.verified);
  } catch (error) {
    console.error(`Error checking verified alerts for ${walletAddress}:`, error);
    return false;
  }
}

