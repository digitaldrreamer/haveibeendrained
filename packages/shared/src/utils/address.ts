import { PublicKey } from '@solana/web3.js';

/**
 * Validates if a string is a valid Solana address (base58-encoded public key)
 * @param address - The address string to validate
 * @returns boolean indicating if the address is valid
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    // Check basic format first (length and characters)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Regex.test(address)) {
      return false;
    }

    // Try to create a PublicKey (this will throw if invalid)
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Shortens an address for display purposes
 * @param address - The full address to shorten
 * @param startChars - Number of characters to show at the start (default: 8)
 * @param endChars - Number of characters to show at the end (default: 8)
 * @returns Shortened address string
 */
export function shortenAddress(
  address: string,
  startChars: number = 8,
  endChars: number = 8
): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Validates and normalizes a Solana address
 * @param address - The address string to validate and normalize
 * @returns Object with validation result and normalized address
 */
export function validateAndNormalizeAddress(address: string): {
  isValid: boolean;
  normalizedAddress?: string;
  error?: string;
} {
  const trimmedAddress = address.trim();

  if (!trimmedAddress) {
    return { isValid: false, error: 'Address is required' };
  }

  if (!isValidSolanaAddress(trimmedAddress)) {
    return { isValid: false, error: 'Invalid Solana address format' };
  }

  return { isValid: true, normalizedAddress: trimmedAddress };
}
