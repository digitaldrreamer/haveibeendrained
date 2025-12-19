/**
 * Email service for sending notifications via SMTP
 * Uses nodemailer with timeout handling
 */

import nodemailer, { type Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
}

/**
 * Email service with SMTP support
 * Supports HTML emails and includes timeout handling
 */
export class EmailService {
  private smtpEnabled: boolean;
  private smtpTransporter?: Transporter;
  private readonly EMAIL_TIMEOUT_MS = 10000; // 10 seconds timeout

  constructor() {
    const SMTP_HOST = process.env.SMTP_HOST || process.env.SMTP_HOSTNAME;
    const SMTP_USER = process.env.SMTP_USER || process.env.SMTP_USERNAME;
    const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const SMTP_PORT = process.env.SMTP_PORT;
    const SMTP_FROM = process.env.SMTP_FROM;

    this.smtpEnabled = !!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM);

    // Debug logging for configuration resolution (non-sensitive)
    console.log('EmailService env resolution:', {
      smtpHostSet: !!SMTP_HOST,
      smtpUserSet: !!SMTP_USER,
      smtpPassSet: !!SMTP_PASS,
      smtpPortSet: !!SMTP_PORT,
      smtpFromSet: !!SMTP_FROM,
      smtpEnabled: this.smtpEnabled,
    });

    if (this.smtpEnabled) {
      console.log('EmailService: SMTP enabled');
    } else {
      console.warn('EmailService: Disabled (no SMTP config)');
    }
  }

  /**
   * Send email with timeout handling and HTML support
   * @param {EmailOptions} options - Email parameters
   * @returns {Promise<SendEmailResult>} Send result with success status and optional message ID
   * @throws {Error} Throws error with specific message for timeout, configuration, or send failures
   */
  async sendEmail(options: EmailOptions): Promise<SendEmailResult> {
    // Validate required parameters
    if (!options.to) {
      const errorMsg = 'Email recipient (to) is required';
      console.error('EmailService error:', { to: options.to, subject: options.subject, error: errorMsg });
      throw new Error(errorMsg);
    }

    if (!options.html && !options.text) {
      const errorMsg = 'Email body (html or text) is required';
      console.error('EmailService error:', { to: options.to, subject: options.subject, error: errorMsg });
      throw new Error(errorMsg);
    }

    console.log('Attempting to send email:', {
      to: options.to,
      subject: options.subject,
      hasHtml: !!options.html,
      hasText: !!options.text,
    });

    // For development without SMTP, just log
    if (process.env.NODE_ENV === 'development' && !this.smtpEnabled) {
      console.log('📧 Email would be sent (dev mode, no SMTP):', {
    to: options.to,
    subject: options.subject,
  });
      console.log('Email content:', options.html || options.text);
      return { success: true };
    }

    // Try SMTP if enabled
    if (this.smtpEnabled) {
      try {
        const result = await Promise.race([
          this._sendViaSMTP(options),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Email send timeout (SMTP)')), this.EMAIL_TIMEOUT_MS),
          ),
        ]);

        console.log('Email sent successfully via SMTP:', {
          to: options.to,
          subject: options.subject,
          messageId: result.messageId,
        });
        return result;
      } catch (error) {
        const err = error as Error;
        console.error('SMTP send failed:', { to: options.to, error: err.message });
        throw new Error(`Email service error: ${err.message}`);
      }
    }

    // No email service configured
    const errorMsg = 'Email service not configured (no SMTP credentials)';
    console.error('EmailService error:', { to: options.to, subject: options.subject, error: errorMsg });
    throw new Error(errorMsg);
  }

  /**
   * Send email via SMTP
   * @private
   */
  private async _sendViaSMTP(options: EmailOptions): Promise<SendEmailResult> {
    const host = process.env.SMTP_HOST || process.env.SMTP_HOSTNAME;
    const user = process.env.SMTP_USER || process.env.SMTP_USERNAME;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const port = Number(process.env.SMTP_PORT || 587);
    const from = process.env.SMTP_FROM as string;

    if (!host || !user || !pass || !from) {
      throw new Error('SMTP credentials are incomplete (missing host, user, pass, or from)');
    }

    if (!this.smtpTransporter) {
      this.smtpTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }

    const info = await this.smtpTransporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return {
      success: true,
      messageId: info?.messageId,
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();

/**
 * Send email (backward compatibility wrapper)
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  await emailService.sendEmail(options);
}

/**
 * Send API key regeneration email
 */
export async function sendApiKeyRegenerationEmail(
  email: string,
  appName: string,
  newApiKey: string,
  keyId: string
): Promise<void> {
  const subject = 'Your API Key Has Been Regenerated - Have I Been Drained';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>API Key Regenerated</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #3E5FFF;">API Key Regenerated</h1>
          
          <p>Your API key for <strong>${appName}</strong> has been invalidated and regenerated.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>New API Key:</strong></p>
            <code style="display: block; margin-top: 10px; padding: 10px; background: white; border-radius: 3px; word-break: break-all;">${newApiKey}</code>
          </div>
          
          <p><strong>Key ID:</strong> ${keyId}</p>
          
          <p><strong style="color: #EF4444;">Important:</strong> Please update your application immediately. The old key will no longer work.</p>
          
          <p>If you did not request this change, please contact support immediately at <a href="mailto:support@haveibeendrained.org">support@haveibeendrained.org</a>.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            This is an automated message from Have I Been Drained API.<br>
            Please do not reply to this email.
          </p>
        </div>
      </body>
    </html>
  `;
  
  const text = `
API Key Regenerated

Your API key for ${appName} has been invalidated and regenerated.

New API Key: ${newApiKey}
Key ID: ${keyId}

Important: Please update your application immediately. The old key will no longer work.

If you did not request this change, please contact support immediately at support@haveibeendrained.org.

This is an automated message from Have I Been Drained API.
  `;
  
  await sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

