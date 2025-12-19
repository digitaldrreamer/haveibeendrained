/**
 * Email service for sending API key notifications
 * For MVP, this is a placeholder - integrate with your email provider
 * (SendGrid, AWS SES, Resend, etc.)
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email (placeholder - implement with your email provider)
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  // TODO: Implement email sending
  // Options:
  // - SendGrid: @sendgrid/mail
  // - AWS SES: @aws-sdk/client-ses
  // - Resend: resend
  // - Nodemailer: nodemailer
  
  console.log('📧 Email would be sent:', {
    to: options.to,
    subject: options.subject,
  });
  
  // For development, just log
  if (process.env.NODE_ENV === 'development') {
    console.log('Email content:', options.html);
    return;
  }
  
  // In production, throw error if email service not configured
  if (!process.env.EMAIL_SERVICE_ENABLED) {
    throw new Error('Email service not configured');
  }
  
  // Implement actual email sending here
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

