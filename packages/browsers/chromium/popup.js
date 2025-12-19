// Default API endpoint
const DEFAULT_API_URL = 'https://api.haveibeendrained.org';

// ============================================================================
// CLIENT-SIDE MOCK SYSTEM (Isolated for Extension)
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

// DOM Elements
const elements = {
  addressInput: document.getElementById('address'),
  checkBtn: document.getElementById('checkBtn'),
  pasteBtn: document.getElementById('pasteBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  checkForm: document.getElementById('checkForm'),
  loading: document.getElementById('loading'),
  results: document.getElementById('results'),
  settings: document.getElementById('settings'),
  apiUrlInput: document.getElementById('apiUrl'),
  saveSettings: document.getElementById('saveSettings'),
  cancelSettings: document.getElementById('cancelSettings'),
};

// State
let apiUrl = DEFAULT_API_URL;

// Initialize
async function init() {
  // Load saved settings
  const settings = await chrome.storage.sync.get(['apiUrl']);
  apiUrl = settings.apiUrl || DEFAULT_API_URL;
  elements.apiUrlInput.value = apiUrl;

  // Add event listeners
  elements.checkBtn.addEventListener('click', handleCheck);
  elements.pasteBtn.addEventListener('click', handlePaste);
  elements.settingsBtn.addEventListener('click', showSettings);
  elements.saveSettings.addEventListener('click', handleSaveSettings);
  elements.cancelSettings.addEventListener('click', hideSettings);
  elements.addressInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleCheck();
  });

  // Focus address input
  elements.addressInput.focus();
}

// Handle paste from clipboard
async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    elements.addressInput.value = text.trim();
    elements.addressInput.focus();
  } catch (err) {
    console.error('Failed to read clipboard:', err);
    showError('Failed to read clipboard. Please paste manually.');
  }
}

// Handle address check
async function handleCheck() {
  const address = elements.addressInput.value.trim();

  // Validate address
  if (!address) {
    showError('Please enter a wallet address');
    return;
  }

  if (address.length < 32 || address.length > 44) {
    showError('Invalid Solana address format');
    return;
  }

  // Show loading
  showView('loading');

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
      showResults(data);
      return;
    }

    // Real API call for non-mock addresses
    const response = await fetch(
      `${apiUrl}/api/v1/check?address=${encodeURIComponent(address)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    showResults(data);
  } catch (err) {
    console.error('Check failed:', err);
    showError(err.message || 'Failed to check address. Please try again.');
  }
}

// Show results
function showResults(data) {
  showView('results');

  // Handle both direct data and wrapped API response format
  const resultData = data.data || data;
  const { overallRisk, severity, detections, recommendations } = resultData;

  // Determine risk color
  const riskClass = severity.toLowerCase();

  elements.results.innerHTML = `
    <div class="result-card">
      <div class="result-header">
        <span class="risk-badge ${riskClass}">${severity}</span>
        <span class="result-score">${overallRisk}%</span>
      </div>
      <div class="result-details">
        <p><strong>Risk Score:</strong> ${overallRisk}% (${severity})</p>
        <p><strong>Detections:</strong> ${detections?.length || 0} potential threat(s) found</p>
        ${detections && detections.length > 0 ? `
          <div style="margin-top: 12px;">
            <p><strong>Top Threats:</strong></p>
            <ul style="margin: 8px 0; padding-left: 20px; color: var(--color-text-secondary);">
              ${detections.slice(0, 3).map(d => `<li>${d.type}: ${d.description || 'Security concern detected'}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${recommendations && recommendations.length > 0 ? `
          <div style="margin-top: 12px;">
            <p><strong>Recommendations:</strong></p>
            <ul style="margin: 8px 0; padding-left: 20px; color: var(--color-text-secondary);">
              ${recommendations.slice(0, 3).map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
      <div class="result-actions">
        <button class="secondary-btn" id="checkAnother">Check Another</button>
        <button class="primary-btn" id="viewDetails">View Full Report</button>
      </div>
    </div>
  `;

  // Add event listeners for action buttons
  document.getElementById('checkAnother').addEventListener('click', () => {
    elements.addressInput.value = '';
    showView('form');
    elements.addressInput.focus();
  });

  document.getElementById('viewDetails').addEventListener('click', () => {
    const address = elements.addressInput.value.trim();
    chrome.tabs.create({
      url: `https://haveibeendrained.org/?address=${encodeURIComponent(address)}`
    });
  });
}

// Show error message
function showError(message) {
  showView('results');
  elements.results.innerHTML = `
    <div class="result-card" style="border-left: 4px solid var(--color-danger);">
      <div style="display: flex; align-items: start; gap: 12px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; color: var(--color-danger);">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div>
          <h3 style="margin-bottom: 8px; font-size: 14px; font-weight: 600;">Error</h3>
          <p style="font-size: 13px; color: var(--color-text-secondary);">${message}</p>
        </div>
      </div>
      <div class="result-actions">
        <button class="secondary-btn" id="tryAgain">Try Again</button>
      </div>
    </div>
  `;

  document.getElementById('tryAgain').addEventListener('click', () => {
    showView('form');
    elements.addressInput.focus();
  });
}

// Show settings
function showSettings() {
  showView('settings');
}

// Hide settings
function hideSettings() {
  showView('form');
  elements.apiUrlInput.value = apiUrl; // Reset to current value
}

// Handle save settings
async function handleSaveSettings() {
  const newApiUrl = elements.apiUrlInput.value.trim() || DEFAULT_API_URL;

  // Validate URL format
  try {
    new URL(newApiUrl);
  } catch (err) {
    showError('Invalid API URL format');
    return;
  }

  // Save to chrome storage
  await chrome.storage.sync.set({ apiUrl: newApiUrl });
  apiUrl = newApiUrl;

  // Show confirmation and return to form
  showView('form');

  // Optional: Show brief success message
  const originalText = elements.checkBtn.querySelector('.btn-text').textContent;
  elements.checkBtn.querySelector('.btn-text').textContent = 'Settings Saved!';
  setTimeout(() => {
    elements.checkBtn.querySelector('.btn-text').textContent = originalText;
  }, 2000);
}

// View management
function showView(view) {
  // Hide all views
  elements.checkForm.classList.add('hidden');
  elements.loading.classList.add('hidden');
  elements.results.classList.add('hidden');
  elements.settings.classList.add('hidden');

  // Show requested view
  switch (view) {
    case 'form':
      elements.checkForm.classList.remove('hidden');
      break;
    case 'loading':
      elements.loading.classList.remove('hidden');
      break;
    case 'results':
      elements.results.classList.remove('hidden');
      break;
    case 'settings':
      elements.settings.classList.remove('hidden');
      break;
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
