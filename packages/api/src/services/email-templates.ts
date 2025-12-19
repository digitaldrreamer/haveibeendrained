/**
 * Email templates for wallet alerts and notifications
 * Styled consistently with haveibeendrained.org branding
 */

const APP_NAME = 'Have I Been Drained?';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://haveibeendrained.org';

// Email styles used across all templates
const emailStyles = `
  /* Reset and base styles */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body { 
    font-family: Arial, Helvetica, sans-serif; 
    background-color: #0f172a; 
    color: #e2e8f0; 
    line-height: 1.6;
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
  
  /* Container */
  .email-container { 
    max-width: 600px; 
    margin: 0 auto; 
    background-color: #1e293b; 
    border-radius: 12px; 
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    overflow: hidden;
  }
  
  /* Header */
  .email-header { 
    background: linear-gradient(135deg, #3E5FFF 0%, #8B5CF6 100%);
    padding: 32px 24px;
    text-align: center;
    border-bottom: 2px solid #334155;
  }
  
  .header-title { 
    color: #ffffff; 
    font-size: 24px; 
    font-weight: 600;
    margin: 0;
  }
  
  /* Content */
  .email-content { 
    padding: 32px 24px; 
    background-color: #1e293b;
  }
  
  .greeting { 
    font-size: 18px; 
    color: #e2e8f0; 
    margin-bottom: 24px;
    font-weight: 600;
  }
  
  .message { 
    font-size: 16px; 
    color: #cbd5e1; 
    margin-bottom: 24px;
    line-height: 1.6;
  }
  
  .highlight { 
    color: #3E5FFF; 
    font-weight: 600;
  }
  
  /* CTA Button */
  .cta-button { 
    display: inline-block; 
    padding: 16px 32px; 
    margin: 24px 0; 
    background: linear-gradient(135deg, #3E5FFF 0%, #8B5CF6 100%);
    color: #ffffff !important; 
    text-decoration: none; 
    border-radius: 8px; 
    font-size: 16px;
    font-weight: 600;
    text-align: center;
    min-width: 200px;
    box-shadow: 0 4px 12px rgba(62,95,255,0.3);
  }
  
  /* Warning boxes */
  .warning-box { 
    background-color: #7f1d1d; 
    border: 1px solid #991b1b; 
    border-radius: 8px; 
    padding: 16px; 
    margin: 20px 0;
  }
  
  .warning-box p { 
    color: #fecaca; 
    font-size: 14px; 
    margin: 0;
  }
  
  .info-box { 
    background-color: #1e3a8a; 
    border-left: 4px solid #3E5FFF; 
    padding: 16px 20px; 
    margin: 20px 0; 
    border-radius: 0 8px 8px 0;
  }
  
  .info-box h3 { 
    color: #93c5fd; 
    font-size: 16px; 
    margin-bottom: 8px;
    font-weight: 600;
  }
  
  .info-box p { 
    color: #cbd5e1; 
    font-size: 14px; 
    margin: 0;
  }
  
  /* Footer */
  .email-footer { 
    background-color: #0f172a; 
    padding: 24px; 
    text-align: center; 
    border-top: 1px solid #334155;
  }
  
  .footer-text { 
    font-size: 14px; 
    color: #94a3b8; 
    margin-bottom: 16px;
  }
  
  .footer-link { 
    color: #3E5FFF; 
    text-decoration: none;
    font-weight: 500;
  }
  
  .footer-link:hover { 
    text-decoration: underline;
  }
  
  /* Responsive */
  @media only screen and (max-width: 600px) {
    .email-container { 
      margin: 0; 
      border-radius: 0;
    }
    
    .email-header, .email-content, .email-footer { 
      padding: 24px 20px;
    }
    
    .cta-button { 
      display: block; 
      width: 100%; 
      min-width: auto;
    }
  }
`;

/**
 * Generates a modular footer for all emails
 */
function generateEmailFooter(): string {
  const currentYear = new Date().getFullYear();

  return `
    <div class="email-footer">
      <p class="footer-text">&copy; ${currentYear} ${APP_NAME}. All rights reserved.</p>
      
      <div class="footer-text">
        <a href="${FRONTEND_URL}" class="footer-link">Visit Website</a> |
        <a href="${FRONTEND_URL}/docs" class="footer-link">Documentation</a>
      </div>
      
      <p class="footer-text" style="font-size: 12px; color: #64748b; margin-top: 16px;">
        This is an automated message from ${APP_NAME}.<br>
        Please do not reply to this email.
      </p>
    </div>
  `;
}

/**
 * Generates HTML email wrapper
 */
function generateEmailHTML(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1 class="header-title">${APP_NAME}</h1>
    </div>
    <div class="email-content">
      ${content}
    </div>
    ${generateEmailFooter()}
  </div>
</body>
</html>
`;
}

/**
 * Build wallet drain alert email
 */
export function buildDrainAlertEmail(params: {
  walletAddress: string;
  drainerAddress?: string;
  riskScore?: number;
}) {
  const { walletAddress, drainerAddress, riskScore } = params;
  const subject = `🚨 Wallet Security Alert - ${walletAddress.slice(0, 8)}...`;
  
  const truncatedAddress = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`;
  
  const content = `
    <h2 class="greeting">Security Alert</h2>
    <p class="message">Hello,</p>
    <p class="message">We detected potential security issues with your Solana wallet: <strong class="highlight">${truncatedAddress}</strong></p>
    
    ${drainerAddress ? `
    <div class="warning-box">
      <p><strong>⚠️ Drainer Detected:</strong> Your wallet has interacted with a known drainer address.</p>
      <p style="margin-top: 8px;">Drainer: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${drainerAddress.slice(0, 8)}...${drainerAddress.slice(-8)}</code></p>
    </div>
    ` : ''}
    
    ${riskScore !== undefined ? `
    <div class="info-box">
      <h3>Risk Assessment</h3>
      <p>Risk Score: <strong>${riskScore}/100</strong></p>
    </div>
    ` : ''}
    
    <div class="warning-box">
      <p><strong>⚠️ Immediate Action Required:</strong></p>
      <ul style="margin: 8px 0 0 20px; color: #fecaca;">
        <li>Review all recent transactions</li>
        <li>Revoke suspicious token approvals</li>
        <li>Move assets to a new wallet if compromised</li>
        <li>Never share your private key or seed phrase</li>
      </ul>
    </div>
    
    <p style="text-align: center; margin: 32px 0;">
      <a href="${FRONTEND_URL}?address=${walletAddress}" class="cta-button">Check Wallet Security</a>
    </p>
    
    <p class="message">If you did not request this alert, please secure your account immediately.</p>
    
    <p class="message">Stay safe,<br>The ${APP_NAME} Team</p>
  `;

  const html = generateEmailHTML(subject, content);
  const text = `Security Alert - Your Solana wallet ${truncatedAddress} may have been compromised. ${drainerAddress ? `Drainer detected: ${drainerAddress}` : ''} Visit ${FRONTEND_URL}?address=${walletAddress} to check your wallet security.`;

  return { subject, html, text };
}

/**
 * Build email verification email
 */
export function buildEmailVerificationEmail(params: {
  email: string;
  verificationToken: string;
  walletAddress: string;
  expiresInHours?: number;
}) {
  const { email, verificationToken, walletAddress, expiresInHours = 24 } = params;
  const subject = 'Verify Your Email - Have I Been Drained';
  const verificationLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
  const truncatedAddress = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`;

  const content = `
    <h2 class="greeting">Verify Your Email</h2>
    <p class="message">Hello,</p>
    <p class="message">You've registered your wallet <strong class="highlight">${truncatedAddress}</strong> to receive security alerts at <strong class="highlight">${email}</strong>.</p>
    
    <p class="message">Please verify your email address by clicking the button below. This link will expire in <strong>${expiresInHours} hours</strong>.</p>
    
    <p style="text-align: center; margin: 32px 0;">
      <a href="${verificationLink}" class="cta-button">Verify Email Address</a>
    </p>
    
    <p class="message" style="font-size: 14px; color: #94a3b8;">Or copy and paste this link into your browser:</p>
    <p class="message" style="font-size: 12px; color: #64748b; word-break: break-all;">${verificationLink}</p>
    
    <div class="info-box">
      <h3>Why verify?</h3>
      <p>Email verification ensures you receive important security alerts about your wallet. Unverified emails will not receive notifications.</p>
    </div>
    
    <p class="message">If you did not request this email, please ignore it.</p>
    
    <p class="message">Thanks,<br>The ${APP_NAME} Team</p>
  `;

  const html = generateEmailHTML(subject, content);
  const text = `Verify Your Email - Please verify your email address for wallet ${truncatedAddress} by visiting: ${verificationLink}. This link expires in ${expiresInHours} hours.`;

  return { subject, html, text };
}

/**
 * Build welcome email after subscription
 */
export function buildWelcomeEmail(params: {
  email: string;
  walletAddress: string;
}) {
  const { email, walletAddress } = params;
  const subject = `Welcome to ${APP_NAME} - Email Alerts Enabled`;
  const truncatedAddress = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`;

  const content = `
    <h2 class="greeting">Welcome! 👋</h2>
    <p class="message">Hello,</p>
    <p class="message">Thank you for setting up email alerts for your Solana wallet <strong class="highlight">${truncatedAddress}</strong>.</p>
    
    <div class="info-box">
      <h3>🚀 What's Next?</h3>
      <p>You'll receive free email notifications whenever we detect potential security issues with your wallet, including:</p>
      <ul style="margin: 8px 0 0 20px; color: #cbd5e1;">
        <li>Interactions with known drainer addresses</li>
        <li>Suspicious transaction patterns</li>
        <li>High-risk wallet activity</li>
      </ul>
    </div>
    
    <p class="message"><strong>Note:</strong> Make sure to verify your email address to start receiving alerts. Check your inbox for a verification email.</p>
    
    <p style="text-align: center; margin: 32px 0;">
      <a href="${FRONTEND_URL}?address=${walletAddress}" class="cta-button">Check Your Wallet</a>
    </p>
    
    <div class="info-box">
      <h3>💡 Pro Tips</h3>
      <p>• Keep your private keys and seed phrases secure</p>
      <p>• Never share your wallet credentials</p>
      <p>• Review token approvals regularly</p>
      <p>• Use hardware wallets for large holdings</p>
    </div>
    
    <p class="message">If you have any questions, visit our <a href="${FRONTEND_URL}/docs" class="footer-link">documentation</a> or contact support.</p>
    
    <p class="message">Stay secure,<br>The ${APP_NAME} Team</p>
  `;

  const html = generateEmailHTML(subject, content);
  const text = `Welcome to ${APP_NAME}! You've successfully set up email alerts for wallet ${truncatedAddress}. You'll receive free notifications about potential security issues. Make sure to verify your email to start receiving alerts. Visit ${FRONTEND_URL}?address=${walletAddress} to check your wallet.`;

  return { subject, html, text };
}


