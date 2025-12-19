import { Context } from 'hono';

export interface ParsedUserAgent {
  isValid: boolean;
  appName?: string;
  version?: string;
  contact?: string;
  apiKey?: string;
  tier: 'unregistered' | 'registered' | 'enterprise';
  raw?: string;
}

/**
 * Parse and validate User-Agent header
 * Format: AppName/Version (Contact; OptionalInfo)
 * 
 * Examples:
 * - ✅ MyApp/1.0.0 (contact@example.com)
 * - ✅ WalletScanner/2.1.0 (https://example.com/contact)
 * - ✅ SecurityBot/1.5.0 (support@company.com; API Key: abc123)
 * - ❌ Mozilla/5.0 (generic browser)
 * - ❌ curl/7.68.0 (no contact info)
 */
export function parseUserAgent(userAgent: string | undefined): ParsedUserAgent {
  if (!userAgent) {
    return {
      isValid: false,
      tier: 'unregistered',
    };
  }

  // Basic format: AppName/Version (Contact; OptionalInfo)
  // Regex: ^([\w-]+)/([\d.]+)\s+\(([^)]+)\)(?:;\s*(.+))?$
  const regex = /^([\w-]+)\/([\d.]+)\s+\(([^)]+)\)(?:\s*;\s*(.+))?$/;
  const match = userAgent.match(regex);

  if (!match) {
    return {
      isValid: false,
      tier: 'unregistered',
      raw: userAgent,
    };
  }

  const [, appName, version, contact, optionalInfo] = match;

  // Validate version is semver-like (X.Y.Z or X.Y)
  const versionRegex = /^\d+\.\d+(\.\d+)?$/;
  if (!versionRegex.test(version)) {
    return {
      isValid: false,
      tier: 'unregistered',
      raw: userAgent,
    };
  }

  // Validate contact is email or URL
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const urlRegex = /^https?:\/\/.+/;
  if (!emailRegex.test(contact) && !urlRegex.test(contact)) {
    return {
      isValid: false,
      tier: 'unregistered',
      raw: userAgent,
    };
  }

  // Extract API key from optional info if present
  let apiKey: string | undefined;
  if (optionalInfo) {
    const apiKeyMatch = optionalInfo.match(/API\s*Key:\s*(\S+)/i);
    if (apiKeyMatch) {
      apiKey = apiKeyMatch[1];
    }
  }

  // Determine tier
  let tier: 'unregistered' | 'registered' | 'enterprise' = 'registered';
  if (apiKey) {
    tier = 'enterprise';
  }

  return {
    isValid: true,
    appName,
    version,
    contact,
    apiKey,
    tier,
    raw: userAgent,
  };
}

/**
 * Middleware to parse User-Agent and store in context
 */
export function userAgentParser() {
  return async (c: Context, next: () => Promise<void>) => {
    const userAgent = c.req.header('User-Agent');
    const parsed = parseUserAgent(userAgent);
    
    // Store in context for use in other middleware/handlers
    c.set('parsedUserAgent', parsed);
    c.set('userAgentTier', parsed.tier);
    
    await next();
  };
}

