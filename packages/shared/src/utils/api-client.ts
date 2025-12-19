import type { RiskReport, DetectionResult } from '../types';
import { getMockWalletData } from './client-mock';

/**
 * Configuration for the API client
 */
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  fetchImpl?: typeof fetch;
  enableClientMock?: boolean; // Enable client-side mocking (default: true)
  mockLoadingDelay?: boolean; // Simulate loading delay for mocks (default: true)
}

/**
 * Request to analyze a wallet for security threats
 */
export interface AnalyzeWalletRequest {
  address: string;
  options?: {
    limit?: number;
    includeTransactions?: boolean;
  };
}

/**
 * Response from wallet analysis
 */
export interface AnalyzeWalletResponse {
  success: boolean;
  data?: RiskReport;
  error?: string;
  timestamp: number;
}

/**
 * API client for communicating with the Have I Been Drained API
 */
export class ApiClient {
  private config: ApiClientConfig;
  private fetch: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      enableClientMock: true, // Enable client-side mocking by default
      mockLoadingDelay: true, // Simulate loading delay by default
      ...config,
    };
    // Use fetchImpl if provided, otherwise detect fetch in a way that works in both SSR and browser
    this.fetch = config.fetchImpl ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
  }

  /**
   * Analyze a wallet for security threats
   * @param request - Analysis request parameters
   * @returns Promise resolving to analysis response
   */
  async analyzeWallet(request: AnalyzeWalletRequest & { experimental?: boolean }): Promise<AnalyzeWalletResponse> {
    try {
      // Check for mock address first (client-side mocking)
      if (this.config.enableClientMock) {
        const mockData = await getMockWalletData(
          request.address,
          this.config.mockLoadingDelay ?? true
        );
        if (mockData) {
          return {
            success: true,
            data: mockData,
            timestamp: Date.now(),
          };
        }
      }

      // * Use public /api/v1/check endpoint for client-side requests
      // * This endpoint works from any origin (no CORS restrictions) and is rate-limited
      // * The /api/internal/check endpoint is CORS-protected and only works from same origin
      // * Since this client runs in the browser, we must use the public endpoint
      const url = new URL('/api/v1/check', this.config.baseUrl);
      url.searchParams.set('address', request.address);

      if (request.options?.limit) {
        url.searchParams.set('limit', request.options.limit.toString());
      }

      if (request.options?.includeTransactions !== undefined) {
        url.searchParams.set('includeTransactions', request.options.includeTransactions.toString());
      }

      if (request.experimental !== undefined) {
        url.searchParams.set('experimental', request.experimental.toString());
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await this.fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();

      // * Public /api/v1/check returns:
      // * { success: boolean, type: 'drainer' | 'wallet_analysis', data: RiskReport, ... }
      return {
        success: json.success ?? true,
        data: (json.data ?? json) as RiskReport,
        timestamp: json.timestamp ?? Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get health status of the API
   * @returns Promise resolving to health check response
   */
  async getHealth(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: number }> {
    try {
      const response = await this.fetch(`${this.config.baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
      };
    }
  }
}

/**
 * Create an API client instance for browser environments
 * Use import.meta.env in Astro/Vite projects
 * 
 * @example
 * ```typescript
 * // In browser/Astro/Vite:
 * const apiClient = new ApiClient({
 *   baseUrl: import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3001'
 * });
 * 
 * // In Node.js:
 * const apiClient = new ApiClient({
 *   baseUrl: process.env.API_BASE_URL || 'http://localhost:3001'
 * });
 * ```
 */
