/**
 * Have I Been Drained Widget - Captcha Style
 * Embeddable wallet security checker widget with captcha-like UX
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
      hash = hash & hash;
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
    '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU': {
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      riskScore: 65,
      severity: 'AT_RISK',
      transactionCount: 12,
      detections: [
        {
          type: 'UNLIMITED_APPROVAL',
          severity: 'HIGH',
          confidence: 90,
          affectedAccounts: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
          suspiciousRecipients: ['5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'],
          recommendations: [
            '⚠️ Revoke unlimited approvals immediately',
            'Check token approvals in your wallet',
            'Consider using a new wallet for future transactions',
          ],
          timestamp: Math.floor(Date.now() / 1000) - 86400,
          signature: generateMockSignature('unlimited-approval-tx'),
        },
      ],
      recommendations: [
        '⚠️ Revoke unlimited approvals immediately',
        'Check token approvals in your wallet',
        'Consider using a new wallet for future transactions',
      ],
      affectedAssets: {
        tokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
        nfts: [],
        sol: 0.5,
      },
    },
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM': {
      address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      riskScore: 95,
      severity: 'DRAINED',
      transactionCount: 8,
      detections: [
        {
          type: 'SET_AUTHORITY',
          severity: 'CRITICAL',
          confidence: 95,
          affectedAccounts: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
          suspiciousRecipients: ['9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'],
          recommendations: [
            '🚨 CRITICAL: Account ownership transferred',
            'Your token account ownership has been transferred',
            'You have likely lost control of these assets',
          ],
          timestamp: Math.floor(Date.now() / 1000) - 172800,
          signature: generateMockSignature('set-authority-tx'),
        },
        {
          type: 'KNOWN_DRAINER',
          severity: 'CRITICAL',
          confidence: 100,
          affectedAccounts: [],
          suspiciousRecipients: ['9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'],
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
   */
  async function getMockWalletData(address, simulateLoading = true) {
    const demoWallet = DEMO_WALLETS[address];
    if (!demoWallet) {
      return null;
    }

    if (simulateLoading) {
      const delay = 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return demoWalletToRiskReport(demoWallet);
  }

  // ============================================================================
  // END CLIENT-SIDE MOCK SYSTEM
  // ============================================================================

  const DEFAULT_CONFIG = {
    theme: 'light',
    apiUrl: 'https://api.haveibeendrained.org',
    showPoweredBy: true,
    onResult: undefined,
  };

  class HIBDWidget {
    constructor() {
      this.config = null;
      this.container = null;
      this.state = {
        status: 'idle', // 'idle' | 'loading' | 'verified' | 'error'
        error: null,
        result: null,
        showAddressModal: false,
        showResultsModal: false,
        address: '',
      };
    }

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

      this.state = {
        status: 'idle',
        error: null,
        result: null,
        showAddressModal: false,
        showResultsModal: false,
        address: '',
      };

      this.render();
    }

    render() {
      const isDark = this.config.theme === 'dark';
      const themeClass = isDark ? 'hibd-dark' : 'hibd-light';

      this.container.innerHTML = `
        <div class="hibd-widget ${themeClass}">
          ${this.getStyles()}
          ${this.state.showAddressModal ? this.getAddressModal() : ''}
          ${this.state.showResultsModal ? this.getResultsModal() : ''}
          ${this.getCaptchaBox()}
        </div>
      `;

      this.attachEventHandlers();
    }

    getCaptchaBox() {
      const { status, result } = this.state;
      const isDark = this.config.theme === 'dark';

      let icon = this.getLogoIcon();
      let text = 'Check wallet security';
      let buttonClass = '';
      let showRefresh = false;
      let showSeeResults = false;

      if (status === 'loading') {
        icon = '<div class="hibd-spinner-small"></div>';
        text = 'Verifying...';
        buttonClass = 'hibd-box-verifying';
      } else if (status === 'verified') {
        if (result) {
          if (result.status === 'safe') {
            icon = this.getCheckIcon('#10b981');
            text = 'Wallet verified';
          } else if (result.status === 'at_risk') {
            icon = this.getAlertIcon('#f59e0b');
            text = 'Issues detected';
          } else if (result.status === 'drained') {
            icon = this.getAlertIcon('#ef4444');
            text = 'Critical issues found';
          }
        } else {
          icon = this.getCheckIcon('#10b981');
          text = 'Verification complete';
        }
        showRefresh = true;
        showSeeResults = true;
      } else if (status === 'error') {
        icon = this.getXIcon('#ef4444');
        text = 'Verification failed';
        showRefresh = true;
      }

      return `
        <div class="hibd-captcha-box ${buttonClass}">
          <div class="hibd-captcha-main">
            <div class="hibd-captcha-icon">
              ${icon}
            </div>
            <div class="hibd-captcha-content">
              <button
                type="button"
                class="hibd-captcha-button"
                id="hibd-check-button"
                ${status === 'loading' ? 'disabled' : ''}
              >
                ${text}
              </button>
              ${showSeeResults ? '<a href="#" class="hibd-see-results" id="hibd-see-results">See Results</a>' : ''}
            </div>
            ${showRefresh ? `
              <button
                type="button"
                class="hibd-refresh-button"
                id="hibd-refresh-button"
                aria-label="Reset verification"
              >
                ${this.getRefreshIcon()}
              </button>
            ` : ''}
          </div>
          ${this.config.showPoweredBy ? `
            <div class="hibd-captcha-footer">
              <div class="hibd-branding">
                ${this.getLogoIcon('#64748b')}
                <span>Have I Been Drained</span>
              </div>
              <a href="https://haveibeendrained.org/privacy" target="_blank" class="hibd-privacy">Privacy</a>
            </div>
          ` : ''}
        </div>
      `;
    }

    getLogoIcon(color = null) {
      // * Have I Been Drained logo - simplified hexagon shield
      // * Uses gradient when no color specified, solid color when color is provided
      const useGradient = !color || color === '#94a3b8';
      const fillColor = useGradient ? 'url(#hibd-logo-grad)' : color;
      const strokeColor = useGradient ? 'url(#hibd-logo-grad)' : color;

      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          ${useGradient ? `
          <defs>
            <linearGradient id="hibd-logo-grad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop stop-color="hsl(206, 75%, 49%)" stop-opacity="1" offset="0%"></stop>
              <stop stop-color="hsl(331, 90%, 56%)" stop-opacity="1" offset="100%"></stop>
            </linearGradient>
          </defs>
          ` : ''}
          <path d="M12 2L4 6L4 12L12 16L20 12L20 6L12 2Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }

    getShieldIcon(color = '#94a3b8') {
      // * Legacy method - redirects to logo for consistency
      return this.getLogoIcon(color);
    }

    getCheckIcon(color = '#10b981') {
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    }

    getAlertIcon(color = '#f59e0b') {
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;
    }

    getXIcon(color = '#ef4444') {
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
    }

    getRefreshIcon(color = '#94a3b8') {
      return `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
        </svg>
      `;
    }

    getAddressModal() {
      return `
        <div class="hibd-modal-overlay" id="hibd-modal-overlay">
          <div class="hibd-modal hibd-modal-address">
            <div class="hibd-modal-header">
              <h3>Verify Wallet Security</h3>
              <button class="hibd-modal-close" id="hibd-close-address-modal">×</button>
            </div>
            <div class="hibd-modal-body">
              <p class="hibd-modal-description">
                Enter your Solana wallet address to check for security issues and potential drains.
              </p>
              <input
                type="text"
                id="hibd-address-input"
                class="hibd-modal-input"
                placeholder="Enter Solana wallet address"
                autocomplete="off"
                value="${this.state.address}"
              />
              <button
                type="button"
                id="hibd-verify-button"
                class="hibd-modal-button"
              >
                Verify Wallet
              </button>
            </div>
          </div>
        </div>
      `;
    }

    getResultsModal() {
      const { result } = this.state;
      if (!result) return '';

      let statusColor = '#10b981';
      let statusBg = '#d1fae5';
      if (result.status === 'at_risk') {
        statusColor = '#f59e0b';
        statusBg = '#fef3c7';
      } else if (result.status === 'drained') {
        statusColor = '#ef4444';
        statusBg = '#fee2e2';
      }

      return `
        <div class="hibd-modal-overlay" id="hibd-results-modal-overlay">
          <div class="hibd-modal hibd-modal-results">
            <div class="hibd-modal-header">
              <h3>Security Report</h3>
              <button class="hibd-modal-close" id="hibd-close-results-modal">×</button>
            </div>
            <div class="hibd-modal-body">
              <div class="hibd-result-status" style="background: ${statusBg}; border-color: ${statusColor};">
                <span class="hibd-result-icon" style="color: ${statusColor};">
                  ${this.getStatusIcon(result.status)}
                </span>
                <span class="hibd-result-message" style="color: ${statusColor};">
                  ${result.message}
                </span>
              </div>

              ${result.details && result.details.riskScore !== undefined ? `
                <div class="hibd-result-score">
                  <div class="hibd-score-label">Risk Score</div>
                  <div class="hibd-score-value" style="color: ${statusColor};">
                    ${result.details.riskScore}/100
                  </div>
                </div>
              ` : ''}

              ${result.details && result.details.recommendations && result.details.recommendations.length > 0 ? `
                <div class="hibd-result-recommendations">
                  <h4>Recommendations</h4>
                  <ul>
                    ${result.details.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              ${result.details && result.details.detections && result.details.detections.length > 0 ? `
                <div class="hibd-result-detections">
                  <h4>Detections</h4>
                  ${result.details.detections.map(detection => `
                    <div class="hibd-detection-item">
                      <strong>${detection.type.replace(/_/g, ' ')}</strong>
                      <span class="hibd-detection-severity">${detection.severity}</span>
                      ${detection.recommendations ? `
                        <ul class="hibd-detection-recs">
                          ${detection.recommendations.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <div class="hibd-result-footer">
                <small>
                  Address: <code>${result.details?.walletAddress || this.state.address}</code>
                </small>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    attachEventHandlers() {
      const checkBtn = document.getElementById('hibd-check-button');
      const refreshBtn = document.getElementById('hibd-refresh-button');
      const seeResultsBtn = document.getElementById('hibd-see-results');
      const verifyBtn = document.getElementById('hibd-verify-button');
      const addressInput = document.getElementById('hibd-address-input');
      const closeAddressModal = document.getElementById('hibd-close-address-modal');
      const closeResultsModal = document.getElementById('hibd-close-results-modal');
      const modalOverlay = document.getElementById('hibd-modal-overlay');
      const resultsModalOverlay = document.getElementById('hibd-results-modal-overlay');

      if (checkBtn) {
        checkBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleCheckClick();
        });
      }

      if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleReset();
        });
      }

      if (seeResultsBtn) {
        seeResultsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.state.showResultsModal = true;
          this.render();
        });
      }

      if (verifyBtn) {
        verifyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleVerify();
        });
      }

      if (addressInput) {
        addressInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.handleVerify();
          }
        });
        addressInput.addEventListener('input', (e) => {
          this.state.address = e.target.value;
        });
      }

      if (closeAddressModal) {
        closeAddressModal.addEventListener('click', (e) => {
          e.preventDefault();
          this.state.showAddressModal = false;
          this.render();
        });
      }

      if (closeResultsModal) {
        closeResultsModal.addEventListener('click', (e) => {
          e.preventDefault();
          this.state.showResultsModal = false;
          this.render();
        });
      }

      if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
          if (e.target === modalOverlay) {
            this.state.showAddressModal = false;
            this.render();
          }
        });
      }

      if (resultsModalOverlay) {
        resultsModalOverlay.addEventListener('click', (e) => {
          if (e.target === resultsModalOverlay) {
            this.state.showResultsModal = false;
            this.render();
          }
        });
      }
    }

    handleCheckClick() {
      if (this.state.status === 'idle' || this.state.status === 'error') {
        this.state.showAddressModal = true;
        this.render();
        setTimeout(() => {
          const input = document.getElementById('hibd-address-input');
          if (input) input.focus();
        }, 100);
      }
    }

    handleVerify() {
      const address = this.state.address.trim();

      if (!address || address.length < 32 || address.length > 44) {
        alert('Please enter a valid Solana wallet address');
        return;
      }

      this.state.showAddressModal = false;
      this.render();
      this.checkWallet();
    }

    handleReset() {
      this.state.status = 'idle';
      this.state.error = null;
      this.state.result = null;
      this.state.address = '';
      this.state.showResultsModal = false;
      this.render();
    }

    async checkWallet() {
      const address = this.state.address;

      this.state.status = 'loading';
      this.state.error = null;
      this.state.result = null;
      this.render();

      try {
        const mockData = await getMockWalletData(address, true);
        if (mockData) {
          const data = {
            success: true,
            data: mockData,
            overallRisk: mockData.overallRisk,
            severity: mockData.severity,
            detections: mockData.detections,
            recommendations: mockData.recommendations,
            timestamp: Date.now(),
          };

          this.state.result = this.processResult(data);
          this.state.status = 'verified';
          this.render();

          if (this.config.onResult && typeof this.config.onResult === 'function') {
            this.config.onResult(this.state.result);
          }

          return;
        }

        const url = `${this.config.apiUrl}/api/v1/check?address=${encodeURIComponent(address)}`;
        const response = await fetch(url, {
          method: 'GET',
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || data.message || 'Failed to check wallet');
        }

        this.state.result = this.processResult(data);
        this.state.status = 'verified';
        this.render();

        if (this.config.onResult && typeof this.config.onResult === 'function') {
          this.config.onResult(this.state.result);
        }
      } catch (error) {
        this.state.error = error.message || 'An error occurred';
        this.state.status = 'error';
        this.render();
      }
    }

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

    getStatusMessage(status) {
      const messages = {
        safe: 'Wallet appears to be safe',
        at_risk: 'Wallet may be at risk',
        drained: 'Wallet has been drained',
      };
      return messages[status] || 'Unknown status';
    }

    getStatusIcon(status) {
      const icons = {
        safe: this.getCheckIcon('#10b981'),
        at_risk: this.getAlertIcon('#f59e0b'),
        drained: this.getAlertIcon('#ef4444'),
      };
      return icons[status] || this.getLogoIcon();
    }

    getStyles() {
      return `
        <style>
          .hibd-widget {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            width: 100%;
            max-width: 320px;
            margin: 0 auto;
          }

          .hibd-captcha-box {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: white;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .hibd-dark .hibd-captcha-box {
            background: #1e293b;
            border-color: #334155;
          }

          .hibd-captcha-main {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
          }

          .hibd-captcha-icon {
            flex-shrink: 0;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          }

          .hibd-captcha-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .hibd-captcha-button {
            background: none;
            border: none;
            padding: 0;
            font-size: 14px;
            color: #475569;
            cursor: pointer;
            text-align: left;
            font-weight: 500;
          }

          .hibd-dark .hibd-captcha-button {
            color: #cbd5e1;
          }

          .hibd-captcha-button:hover:not(:disabled) {
            color: #0f172a;
          }

          .hibd-dark .hibd-captcha-button:hover:not(:disabled) {
            color: #f1f5f9;
          }

          .hibd-captcha-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .hibd-see-results {
            font-size: 12px;
            color: #3b82f6;
            text-decoration: none;
          }

          .hibd-see-results:hover {
            text-decoration: underline;
          }

          .hibd-refresh-button {
            flex-shrink: 0;
            width: 24px;
            height: 24px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 18px;
            color: #94a3b8;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .hibd-refresh-button:hover {
            color: #475569;
          }

          .hibd-captcha-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
          }

          .hibd-dark .hibd-captcha-footer {
            border-color: #334155;
          }

          .hibd-branding {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #64748b;
          }

          .hibd-shield {
            font-size: 12px;
          }

          .hibd-privacy {
            color: #64748b;
            text-decoration: none;
          }

          .hibd-privacy:hover {
            color: #3b82f6;
          }

          .hibd-spinner-small {
            width: 20px;
            height: 20px;
            border: 2px solid #e2e8f0;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .hibd-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease-in;
            padding: 20px;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .hibd-modal {
            background: white;
            border-radius: 12px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.3s ease-out;
          }

          .hibd-dark .hibd-modal {
            background: #1e293b;
            border: 1px solid #334155;
          }

          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          .hibd-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            border-bottom: 1px solid #e2e8f0;
          }

          .hibd-dark .hibd-modal-header {
            border-color: #334155;
          }

          .hibd-modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #0f172a;
          }

          .hibd-dark .hibd-modal-header h3 {
            color: #f1f5f9;
          }

          .hibd-modal-close {
            background: none;
            border: none;
            font-size: 28px;
            color: #94a3b8;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
          }

          .hibd-modal-close:hover {
            color: #475569;
          }

          .hibd-modal-body {
            padding: 24px;
          }

          .hibd-modal-description {
            margin: 0 0 16px 0;
            font-size: 14px;
            color: #64748b;
            line-height: 1.5;
          }

          .hibd-modal-input {
            width: 100%;
            padding: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 16px;
            box-sizing: border-box;
          }

          .hibd-dark .hibd-modal-input {
            background: #0f172a;
            border-color: #475569;
            color: #f1f5f9;
          }

          .hibd-modal-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .hibd-modal-button {
            width: 100%;
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
          }

          .hibd-modal-button:hover {
            opacity: 0.9;
          }

          .hibd-result-status {
            padding: 16px;
            border-radius: 8px;
            border: 2px solid;
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
          }

          .hibd-result-icon {
            font-size: 24px;
          }

          .hibd-result-message {
            font-size: 16px;
            font-weight: 600;
          }

          .hibd-result-score {
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

          .hibd-dark .hibd-result-score {
            background: #0f172a;
          }

          .hibd-score-label {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
          }

          .hibd-score-value {
            font-size: 24px;
            font-weight: 700;
          }

          .hibd-result-recommendations,
          .hibd-result-detections {
            margin-bottom: 20px;
          }

          .hibd-result-recommendations h4,
          .hibd-result-detections h4 {
            margin: 0 0 12px 0;
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
          }

          .hibd-dark .hibd-result-recommendations h4,
          .hibd-dark .hibd-result-detections h4 {
            color: #f1f5f9;
          }

          .hibd-result-recommendations ul {
            margin: 0;
            padding-left: 20px;
            color: #475569;
          }

          .hibd-dark .hibd-result-recommendations ul {
            color: #cbd5e1;
          }

          .hibd-result-recommendations li {
            margin: 8px 0;
            line-height: 1.5;
          }

          .hibd-detection-item {
            padding: 12px;
            background: #f8fafc;
            border-radius: 8px;
            margin-bottom: 12px;
          }

          .hibd-dark .hibd-detection-item {
            background: #0f172a;
          }

          .hibd-detection-item strong {
            display: block;
            margin-bottom: 4px;
            color: #0f172a;
            text-transform: capitalize;
          }

          .hibd-dark .hibd-detection-item strong {
            color: #f1f5f9;
          }

          .hibd-detection-severity {
            display: inline-block;
            padding: 2px 8px;
            background: #fee2e2;
            color: #991b1b;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 8px;
          }

          .hibd-detection-recs {
            margin: 8px 0 0 0;
            padding-left: 20px;
            font-size: 13px;
            color: #64748b;
          }

          .hibd-dark .hibd-detection-recs {
            color: #94a3b8;
          }

          .hibd-detection-recs li {
            margin: 4px 0;
          }

          .hibd-result-footer {
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
          }

          .hibd-dark .hibd-result-footer {
            border-color: #334155;
            color: #94a3b8;
          }

          .hibd-result-footer code {
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-family: monospace;
          }

          .hibd-dark .hibd-result-footer code {
            background: #0f172a;
          }
        </style>
      `;
    }
  }

  const widgetInstance = new HIBDWidget();

  global.HIBDWidget = {
    init: (config) => widgetInstance.init(config),
  };

  global.HIBDWidgetInstance = widgetInstance;

})(typeof window !== 'undefined' ? window : this);