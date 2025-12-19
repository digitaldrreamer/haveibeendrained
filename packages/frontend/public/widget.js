/**
 * Have I Been Drained Widget
 * Embeddable wallet security checker widget
 */
(function (global) {
  'use strict';

  // ============================================================================
  // CLIENT-SIDE MOCK SYSTEM (Isolated for Widget)
  // ============================================================================

  /**
   * Generate a valid-looking base58 transaction signature (88 characters)
   */
  function generateMockSignature(seed) {
    const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    let result = '';
    let num = Math.abs(hash);
    for (let i = 0; i < 88; i++) {
      result += base58[num % base58.length];
      num = Math.floor(num / base58.length);
    }
    return result;
  }

  // Demo wallet definitions
  const DEMO_WALLETS = {
    // Safe wallet - System Program (valid Solana address)
    '11111111111111111111111111111111': {
      address: '11111111111111111111111111111111',
      riskScore: 0,
      severity: 'SAFE',
      transactionCount: 5,
      detections: [],
      recommendations: [
        '✅ Your wallet appears safe',
        'Continue monitoring transactions',
        'Keep your private keys secure',
      ],
      affectedAssets: {
        tokens: [],
        nfts: [],
        sol: 0,
      },
    },

    // At-risk wallet (unlimited approvals)
    'ATRISK1111111111111111111111111111111': {
      address: 'ATRISK1111111111111111111111111111111',
      riskScore: 65,
      severity: 'AT_RISK',
      transactionCount: 12,
      detections: [
        {
          type: 'UNLIMITED_APPROVAL',
          severity: 'HIGH',
          confidence: 90,
          affectedAccounts: ['TokenAccount1111111111111111111111111'],
          suspiciousRecipients: ['DrainerAddress111111111111111111111111'],
          recommendations: [
            '⚠️ Revoke unlimited approvals immediately',
            'Check token approvals in your wallet',
            'Consider using a new wallet for future transactions',
          ],
          timestamp: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
          signature: generateMockSignature('unlimited-approval-tx'),
        },
      ],
      recommendations: [
        '⚠️ Revoke unlimited approvals immediately',
        'Check token approvals in your wallet',
        'Consider using a new wallet for future transactions',
      ],
      affectedAssets: {
        tokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'], // USDC
        nfts: [],
        sol: 0.5,
      },
    },

    // Drained wallet (SetAuthority attack + known drainer)
    'DRAINED111111111111111111111111111111': {
      address: 'DRAINED111111111111111111111111111111',
      riskScore: 95,
      severity: 'DRAINED',
      transactionCount: 8,
      detections: [
        {
          type: 'SET_AUTHORITY',
          severity: 'CRITICAL',
          confidence: 95,
          affectedAccounts: ['TokenAccount2222222222222222222222222'],
          suspiciousRecipients: ['DrainerAddress222222222222222222222222'],
          recommendations: [
            '🚨 CRITICAL: Account ownership transferred',
            'Your token account ownership has been transferred',
            'You have likely lost control of these assets',
          ],
          timestamp: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
          signature: generateMockSignature('set-authority-tx'),
        },
        {
          type: 'KNOWN_DRAINER',
          severity: 'CRITICAL',
          confidence: 100,
          affectedAccounts: [],
          suspiciousRecipients: ['DrainerAddress222222222222222222222222'],
          domains: ['malicious-drainer.com'],
          recommendations: [
            '🚨 CRITICAL: Interacted with known drainer',
            'This address is in our on-chain registry',
            'Your wallet has been compromised',
          ],
          timestamp: Math.floor(Date.now() / 1000) - 172800,
          signature: generateMockSignature('known-drainer-tx'),
        },
      ],
      recommendations: [
        '🚨 CRITICAL: Your wallet has been compromised',
        'Do not use this wallet anymore',
        'Create a new wallet immediately',
        'Report the drainer address',
      ],
      affectedAssets: {
        tokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'So11111111111111111111111111111111111111112'],
        nfts: ['NFT1111111111111111111111111111111111111111'],
        sol: 2.5,
      },
    },

    // Known drainer interaction
    'DRAINER111111111111111111111111111111': {
      address: 'DRAINER111111111111111111111111111111',
      riskScore: 85,
      severity: 'AT_RISK',
      transactionCount: 15,
      detections: [
        {
          type: 'KNOWN_DRAINER',
          severity: 'CRITICAL',
          confidence: 100,
          affectedAccounts: [],
          suspiciousRecipients: ['DrainerAddress333333333333333333333333'],
          domains: ['phishing-site.com', 'fake-solana-wallet.com'],
          recommendations: [
            '🚨 CRITICAL: Interacted with known drainer',
            'This address is in our on-chain registry',
            'Revoke all approvals immediately',
          ],
          timestamp: Math.floor(Date.now() / 1000) - 259200, // 3 days ago
          signature: generateMockSignature('drainer-interaction-tx'),
        },
      ],
      recommendations: [
        '⚠️ You interacted with a known drainer',
        'Revoke all approvals immediately',
        'Monitor your wallet for suspicious activity',
        'Consider creating a new wallet',
      ],
      affectedAssets: {
        tokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
        nfts: [],
        sol: 0.1,
      },
    },
  };

  /**
   * Convert demo wallet to RiskReport format
   */
  function demoWalletToRiskReport(demo) {
    return {
      overallRisk: demo.riskScore,
      severity: demo.severity,
      detections: demo.detections,
      recommendations: demo.recommendations,
      walletAddress: demo.address,
      transactionCount: demo.transactionCount,
      affectedAssets: demo.affectedAssets,
      analyzedAt: Date.now(),
    };
  }

  /**
   * Get mock wallet data if address matches a demo wallet
   * @param {string} address - Wallet address to check
   * @param {boolean} simulateLoading - If true, adds a delay to simulate API call (default: true)
   * @returns {Promise<Object|null>} Promise resolving to RiskReport or null if not a mock address
   */
  async function getMockWalletData(address, simulateLoading = true) {
    const demoWallet = DEMO_WALLETS[address];
    if (!demoWallet) {
      return null;
    }

    // Simulate loading delay (1-2 seconds)
    if (simulateLoading) {
      const delay = 1000 + Math.random() * 1000; // 1-2 seconds
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return demoWalletToRiskReport(demoWallet);
  }

  // ============================================================================
  // END CLIENT-SIDE MOCK SYSTEM
  // ============================================================================

  // * Widget configuration interface
  const DEFAULT_CONFIG = {
    theme: 'dark',
    apiUrl: 'https://api.haveibeendrained.org',
    showPoweredBy: true,
    onResult: undefined,
  };

  // * Widget state management
  class HIBDWidget {
    constructor() {
      this.config = null;
      this.container = null;
      this.state = {
        loading: false,
        error: null,
        result: null,
      };
    }

    /**
     * Initialize the widget
     * @param {Object} config - Widget configuration
     */
    init(config) {
      if (!config || !config.containerId) {
        console.error('HIBDWidget: containerId is required');
        return;
      }

      this.config = { ...DEFAULT_CONFIG, ...config };
      this.container = document.getElementById(this.config.containerId);

      if (!this.container) {
        console.error(`HIBDWidget: Container with id "${this.config.containerId}" not found`);
        return;
      }

      this.render();
    }

    /**
     * Render the widget UI
     */
    render() {
      const isDark = this.config.theme === 'dark';
      const themeClass = isDark ? 'hibd-dark' : 'hibd-light';

      this.container.innerHTML = `
        <div class="hibd-widget ${themeClass}">
          ${this.getStyles()}
          <div class="hibd-content">
            <div class="hibd-header">
              <h3 class="hibd-title">Check Wallet Security</h3>
            </div>
            <div class="hibd-form">
              <input 
                type="text" 
                id="hibd-address-input" 
                class="hibd-input" 
                placeholder="Enter Solana wallet address"
                autocomplete="off"
              />
              <button 
                id="hibd-check-button" 
                class="hibd-button"
              >
                Check
              </button>
            </div>
            <div id="hibd-result" class="hibd-result"></div>
            ${this.config.showPoweredBy ? this.getPoweredBy() : ''}
          </div>
        </div>
      `;

      // * Attach event handlers
      const input = document.getElementById('hibd-address-input');
      const button = document.getElementById('hibd-check-button');

      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.checkWallet();
          }
        });
      }

      if (button) {
        button.addEventListener('click', () => {
          this.checkWallet();
        });
      }
    }

    /**
     * Check wallet security
     */
    async checkWallet() {
      const input = document.getElementById('hibd-address-input');
      const button = document.getElementById('hibd-check-button');
      const resultDiv = document.getElementById('hibd-result');

      if (!input || !button || !resultDiv) return;

      const address = input.value.trim();

      // * Validate address format (basic Solana address validation)
      if (!address || address.length < 32 || address.length > 44) {
        this.showError('Please enter a valid Solana wallet address');
        return;
      }

      // * Update UI state
      this.state.loading = true;
      this.state.error = null;
      this.state.result = null;
      button.disabled = true;
      button.textContent = 'Checking...';
      resultDiv.innerHTML = '<div class="hibd-loading">Analyzing wallet security...</div>';

      try {
        // Check for mock address first (client-side mocking)
        const mockData = await getMockWalletData(address, true);
        if (mockData) {
          // Format mock data to match API response format
          const data = {
            success: true,
            data: mockData,
            overallRisk: mockData.overallRisk,
            severity: mockData.severity,
            detections: mockData.detections,
            recommendations: mockData.recommendations,
            timestamp: Date.now(),
          };

          // * Process result
          this.state.result = this.processResult(data);
          this.renderResult(resultDiv, this.state.result);

          // * Call callback if provided
          if (this.config.onResult && typeof this.config.onResult === 'function') {
            this.config.onResult(this.state.result);
          }

          this.state.loading = false;
          button.disabled = false;
          button.textContent = 'Check';
          return;
        }

        // Real API call for non-mock addresses
        const url = `${this.config.apiUrl}/api/v1/check?address=${encodeURIComponent(address)}`;
        const response = await fetch(url, {
          method: 'GET',
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || data.message || 'Failed to check wallet');
        }

        // * Process result
        this.state.result = this.processResult(data);
        this.renderResult(resultDiv, this.state.result);

        // * Call callback if provided
        if (this.config.onResult && typeof this.config.onResult === 'function') {
          this.config.onResult(this.state.result);
        }
      } catch (error) {
        this.state.error = error.message || 'An error occurred';
        this.showError(this.state.error);
      } finally {
        this.state.loading = false;
        button.disabled = false;
        button.textContent = 'Check';
      }
    }

    /**
     * Process API response into widget-friendly format
     * @param {Object} apiResponse - API response data
     * @returns {Object} Processed result
     */
    processResult(apiResponse) {
      if (apiResponse.type === 'drainer') {
        return {
          status: 'drained',
          type: 'drainer',
          message: 'This address is a known drainer',
          details: apiResponse.data,
        };
      }

      if (apiResponse.type === 'wallet_analysis') {
        const data = apiResponse.data;
        const severity = data.severity || data.overallRisk;

        let status = 'safe';
        if (severity === 'DRAINED' || (typeof severity === 'number' && severity >= 90)) {
          status = 'drained';
        } else if (severity === 'AT_RISK' || (typeof severity === 'number' && severity >= 40)) {
          status = 'at_risk';
        }

        return {
          status,
          type: 'wallet_analysis',
          message: this.getStatusMessage(status),
          details: data,
        };
      }

      return {
        status: 'unknown',
        type: 'unknown',
        message: 'Unable to determine wallet status',
        details: apiResponse,
      };
    }

    /**
     * Get status message
     * @param {string} status - Status value
     * @returns {string} Status message
     */
    getStatusMessage(status) {
      const messages = {
        safe: 'Wallet appears to be safe',
        at_risk: 'Wallet may be at risk',
        drained: 'Wallet has been drained',
      };
      return messages[status] || 'Unknown status';
    }

    /**
     * Render result in the UI
     * @param {HTMLElement} container - Result container element
     * @param {Object} result - Processed result
     */
    renderResult(container, result) {
      const statusClass = `hibd-status-${result.status}`;
      const icon = this.getStatusIcon(result.status);

      let detailsHtml = '';
      if (result.details) {
        if (result.type === 'drainer' && result.details.reportCount) {
          detailsHtml = `
            <div class="hibd-details">
              <p><strong>Reports:</strong> ${result.details.reportCount}</p>
              ${result.details.totalSolReported ? `<p><strong>Total SOL Reported:</strong> ${result.details.totalSolReported.toFixed(2)}</p>` : ''}
            </div>
          `;
        } else if (result.type === 'wallet_analysis' && result.details.riskScore !== undefined) {
          detailsHtml = `
            <div class="hibd-details">
              <p><strong>Risk Score:</strong> ${result.details.riskScore}/100</p>
              ${result.details.recommendations && result.details.recommendations.length > 0 ? `
                <div class="hibd-recommendations">
                  <strong>Recommendations:</strong>
                  <ul>
                    ${result.details.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          `;
        }
      }

      container.innerHTML = `
        <div class="hibd-result-content ${statusClass}">
          <div class="hibd-status">
            <span class="hibd-icon">${icon}</span>
            <span class="hibd-message">${result.message}</span>
          </div>
          ${detailsHtml}
        </div>
      `;
    }

    /**
     * Get status icon
     * @param {string} status - Status value
     * @returns {string} Icon emoji
     */
    getStatusIcon(status) {
      const icons = {
        safe: '✅',
        at_risk: '⚠️',
        drained: '🚨',
      };
      return icons[status] || '❓';
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
      const resultDiv = document.getElementById('hibd-result');
      if (resultDiv) {
        resultDiv.innerHTML = `
          <div class="hibd-error">
            <span class="hibd-icon">❌</span>
            <span>${message}</span>
          </div>
        `;
      }
    }

    /**
     * Get "Powered by" attribution
     * @returns {string} HTML for attribution
     */
    getPoweredBy() {
      return `
        <div class="hibd-powered-by">
          <a href="https://haveibeendrained.org" target="_blank" rel="noopener noreferrer">
            Powered by Have I Been Drained
          </a>
        </div>
      `;
    }

    /**
     * Get widget styles
     * @returns {string} CSS styles
     */
    getStyles() {
      return `
        <style>
          .hibd-widget {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-width: 500px;
            margin: 0 auto;
          }

          .hibd-content {
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .hibd-dark .hibd-content {
            background: #1e293b;
            border: 1px solid #334155;
            color: #f1f5f9;
          }

          .hibd-light .hibd-content {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            color: #1e293b;
          }

          .hibd-header {
            margin-bottom: 16px;
          }

          .hibd-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
          }

          .hibd-form {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
          }

          .hibd-input {
            flex: 1;
            padding: 10px 12px;
            border-radius: 6px;
            border: 1px solid;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
          }

          .hibd-dark .hibd-input {
            background: #0f172a;
            border-color: #475569;
            color: #f1f5f9;
          }

          .hibd-dark .hibd-input:focus {
            border-color: #3b82f6;
          }

          .hibd-light .hibd-input {
            background: #ffffff;
            border-color: #cbd5e1;
            color: #1e293b;
          }

          .hibd-light .hibd-input:focus {
            border-color: #3b82f6;
          }

          .hibd-button {
            padding: 10px 20px;
            border-radius: 6px;
            border: none;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: opacity 0.2s, transform 0.1s;
            white-space: nowrap;
          }

          .hibd-button:hover:not(:disabled) {
            opacity: 0.9;
            transform: translateY(-1px);
          }

          .hibd-button:active:not(:disabled) {
            transform: translateY(0);
          }

          .hibd-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .hibd-dark .hibd-button {
            background: #3b82f6;
            color: #ffffff;
          }

          .hibd-light .hibd-button {
            background: #3b82f6;
            color: #ffffff;
          }

          .hibd-result {
            min-height: 40px;
            margin-bottom: 12px;
          }

          .hibd-loading {
            padding: 12px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }

          .hibd-result-content {
            padding: 12px;
            border-radius: 6px;
            border: 1px solid;
          }

          .hibd-status-safe {
            background: rgba(16, 185, 129, 0.1);
            border-color: rgba(16, 185, 129, 0.3);
          }

          .hibd-status-at_risk {
            background: rgba(245, 158, 11, 0.1);
            border-color: rgba(245, 158, 11, 0.3);
          }

          .hibd-status-drained {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.3);
          }

          .hibd-status {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }

          .hibd-icon {
            font-size: 18px;
          }

          .hibd-message {
            font-weight: 500;
            font-size: 14px;
          }

          .hibd-details {
            margin-top: 8px;
            font-size: 13px;
            line-height: 1.6;
          }

          .hibd-details p {
            margin: 4px 0;
          }

          .hibd-recommendations {
            margin-top: 8px;
          }

          .hibd-recommendations ul {
            margin: 4px 0 0 20px;
            padding: 0;
          }

          .hibd-recommendations li {
            margin: 4px 0;
          }

          .hibd-error {
            padding: 12px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #ef4444;
            font-size: 14px;
          }

          .hibd-powered-by {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid;
            text-align: center;
            font-size: 12px;
          }

          .hibd-dark .hibd-powered-by {
            border-color: #334155;
          }

          .hibd-light .hibd-powered-by {
            border-color: #e2e8f0;
          }

          .hibd-powered-by a {
            color: #3b82f6;
            text-decoration: none;
          }

          .hibd-powered-by a:hover {
            text-decoration: underline;
          }
        </style>
      `;
    }
  }

  // * Create global instance
  const widgetInstance = new HIBDWidget();

  // * Expose to global scope
  global.HIBDWidget = {
    init: (config) => widgetInstance.init(config),
  };

  // * Store instance reference (for debugging if needed)
  global.HIBDWidgetInstance = widgetInstance;

})(typeof window !== 'undefined' ? window : this);

