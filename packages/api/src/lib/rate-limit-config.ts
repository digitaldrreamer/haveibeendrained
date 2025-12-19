/**
 * Rate limit configurations per tier
 */
export const RATE_LIMITS = {
  // Unregistered: 10 requests/hour (stricter for no User-Agent)
  UNREGISTERED: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 10,
  },

  // Registered: 100 requests/hour (valid User-Agent format)
  REGISTERED: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 100,
  },

  // Enterprise: 1000 requests/hour (with API key)
  ENTERPRISE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 1000,
  },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

/**
 * Get rate limit config for a tier
 */
export function getRateLimitForTier(tier: 'unregistered' | 'registered' | 'enterprise') {
  switch (tier) {
    case 'unregistered':
      return RATE_LIMITS.UNREGISTERED;
    case 'registered':
      return RATE_LIMITS.REGISTERED;
    case 'enterprise':
      return RATE_LIMITS.ENTERPRISE;
    default:
      return RATE_LIMITS.UNREGISTERED;
  }
}

