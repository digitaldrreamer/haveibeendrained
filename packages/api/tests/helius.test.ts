import { HeliusClient } from '../src/services/helius';
import { describe, it, expect } from 'bun:test';

describe('HeliusClient', () => {
    it('should be instantiated with an API key', () => {
        const client = new HeliusClient('test-api-key');
        expect(client).toBeDefined();
    });

    // Note: We can't easily test the actual RPC call without a valid API key and network access in this environment,
    // but we can verify the class structure and basic logic.
});
