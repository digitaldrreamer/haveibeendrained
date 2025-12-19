import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { ApiClient } from '../src/utils/api-client';
import type { RiskReport } from '../src/types';

const baseUrl = 'http://localhost:4000';

describe('ApiClient', () => {
  let client: ApiClient;
  let fetchMock: ReturnType<typeof mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>>;

  beforeEach(() => {
    fetchMock = mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
    fetchMock.mockReset();
    client = new ApiClient({ baseUrl, timeout: 5000, fetchImpl: fetchMock });
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it('returns success response on analyzeWallet', async () => {
    const mockReport: RiskReport = {
      overallRisk: 42,
      severity: 'AT_RISK',
      detections: [],
      affectedAssets: { tokens: [], nfts: [], sol: 0 },
      recommendations: ['Stay cautious'],
      analyzedAt: Date.now(),
      walletAddress: '11111111111111111111111111111111',
      transactionCount: 1,
    };

    fetchMock.mockImplementation(async () =>
      new Response(JSON.stringify(mockReport), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.analyzeWallet({ address: mockReport.walletAddress });

    expect(result.success).toBe(true);
    expect(result.data?.walletAddress).toBe(mockReport.walletAddress);
    expect(result.data?.overallRisk).toBe(42);
  });

  it('returns error response when API fails', async () => {
    fetchMock.mockImplementation(async () =>
      new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.analyzeWallet({ address: '11111111111111111111111111111111' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Server error');
  });

  it('returns unhealthy status when health check fails', async () => {
    fetchMock.mockImplementation(async () => {
      throw new Error('Network down');
    });

    const result = await client.getHealth();

    expect(result.status).toBe('unhealthy');
  });
});

