// Default API endpoint
const DEFAULT_API_URL = 'https://api.haveibeendrained.org';

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

    const { overallRisk, severity, detections, recommendations } = data;

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
            url: `https://haveibeendrained.org/check?address=${encodeURIComponent(address)}`
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
