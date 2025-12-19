import type { RiskReport, DetectionResult } from '../types';

/**
 * Configuration for the API client
 */
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  fetchImpl?: typeof fetch;
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
      ...config,
    };
    this.fetch = config.fetchImpl ?? globalThis.fetch;
  }

  /**
   * Analyze a wallet for security threats
   * @param request - Analysis request parameters
   * @returns Promise resolving to analysis response
   */
  async analyzeWallet(request: AnalyzeWalletRequest & { experimental?: boolean }): Promise<AnalyzeWalletResponse> {
    try {
      // Use internal, CORS-protected, non-rate-limited endpoint for the frontend
      // Mirrors the public /api/v1/check behavior but without public rate limits
      const url = new URL('/api/internal/check', this.config.baseUrl);
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

      // Internal /api/internal/check returns:
      // { success: boolean, type: 'drainer' | 'wallet_analysis', data: RiskReport, ... }
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
