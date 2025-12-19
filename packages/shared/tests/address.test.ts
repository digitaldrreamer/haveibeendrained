import { describe, expect, it } from 'bun:test';
import { isValidSolanaAddress, shortenAddress, validateAndNormalizeAddress } from '../src/utils/address';

describe('address utils', () => {
  const validAddress = '11111111111111111111111111111111'; // System Program
  const validLongAddress = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

  it('validates Solana addresses correctly', () => {
    expect(isValidSolanaAddress(validAddress)).toBe(true);
    expect(isValidSolanaAddress(validLongAddress)).toBe(true);
    expect(isValidSolanaAddress('not-valid')).toBe(false);
    expect(isValidSolanaAddress('O0O0O0O0O0O0O0O0O0O0O0O0O0O0O0')).toBe(false); // invalid chars
  });

  it('shortens addresses for display', () => {
    const shortened = shortenAddress(validLongAddress, 4, 4);
    expect(shortened.startsWith('Memo')).toBe(true);
    expect(shortened.endsWith('fcHr')).toBe(true);
    expect(shortened.includes('...')).toBe(true);
  });

  it('validates and normalizes addresses with trimming', () => {
    const result = validateAndNormalizeAddress(`  ${validAddress}  `);
    expect(result.isValid).toBe(true);
    expect(result.normalizedAddress).toBe(validAddress);
  });

  it('rejects empty or invalid inputs', () => {
    expect(validateAndNormalizeAddress('')).toEqual({ isValid: false, error: 'Address is required' });
    expect(validateAndNormalizeAddress('bad')).toEqual({ isValid: false, error: 'Invalid Solana address format' });
  });
});

