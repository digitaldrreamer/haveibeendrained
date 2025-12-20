<script lang="ts">
  import { createBubbler, stopPropagation } from 'svelte/legacy';

  const bubble = createBubbler();
  import { onMount } from 'svelte';

  let isWalletConnected = $state(false);
  let showEmailAlertsModal = $state(false);

  onMount(() => {
    // Check localStorage for wallet connection
    const stored = localStorage.getItem('wallet_alert_state');
    if (stored) {
      try {
        const state = JSON.parse(stored);
        isWalletConnected = !!state.walletAddress;
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Listen for wallet connection events
    const handleWalletConnected = () => {
      isWalletConnected = true;
    };

    const handleWalletDisconnected = () => {
      isWalletConnected = false;
    };

    // Also listen for storage changes (cross-tab)
    const handleStorageChange = () => {
      const stored = localStorage.getItem('wallet_alert_state');
      isWalletConnected = !!stored && JSON.parse(stored).walletAddress;
    };

    window.addEventListener('wallet-connected', handleWalletConnected);
    window.addEventListener('wallet-disconnected', handleWalletDisconnected);
    window.addEventListener('storage', handleStorageChange);

    // Close modal when wallet connects
    const handleWalletConnectedForModal = () => {
      showEmailAlertsModal = false;
    };
    window.addEventListener('wallet-connected', handleWalletConnectedForModal);

    return () => {
      window.removeEventListener('wallet-connected', handleWalletConnected);
      window.removeEventListener('wallet-disconnected', handleWalletDisconnected);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wallet-connected', handleWalletConnectedForModal);
    };
  });

  function openEmailAlertsModal() {
    showEmailAlertsModal = true;
  }

  function closeEmailAlertsModal() {
    showEmailAlertsModal = false;
  }
</script>

{#if !isWalletConnected}
  <section class="py-20 px-4 bg-gradient-to-r from-primary/10 to-purple-500/10">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-4xl md:text-5xl font-bold mb-6">Protect Your Solana Assets Today</h2>
      <p class="text-xl text-text-muted mb-8 max-w-2xl mx-auto">
        Don't wait until it's too late. Analyze your wallet security now and get peace of mind about your crypto holdings.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
        <a href="#hero" class="px-8 py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors text-lg">
          Analyze My Wallet
        </a>
        <button
          onclick={openEmailAlertsModal}
          class="px-8 py-4 bg-gradient-to-r from-primary to-purple-500 hover:from-primary-hover hover:to-purple-600 text-white font-bold rounded-xl transition-colors text-lg"
        >
          Get Email Alerts (Free)
        </button>
        <a href="https://docs.haveibeendrained.org/user-guide/browser-extensions" target="_blank" rel="noopener noreferrer" class="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-colors text-lg">
          Browser Extension
        </a>
        <a href="https://chainabuse.com/report" target="_blank" rel="noopener noreferrer" class="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors text-lg">
          Report to ChainAbuse
        </a>
        <a href="https://github.com/digitaldrreamer/haveibeendrained" target="_blank" rel="noopener noreferrer" class="px-8 py-4 bg-surface hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-600 transition-colors text-lg">
          View on GitHub
        </a>
      </div>
      <p class="text-sm text-text-muted mt-4">
        💡 <strong>Free email alerts</strong> - Get notified instantly if your wallet is compromised
      </p>
    </div>
  </section>
{/if}

{#if showEmailAlertsModal}
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onclick={closeEmailAlertsModal}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Escape' && closeEmailAlertsModal()}
  >
    <div
      class="bg-surface border border-slate-600 rounded-xl p-6 max-w-md w-full"
      onclick={stopPropagation(bubble('click'))}
    >
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-2xl font-bold text-white">Get Email Alerts</h3>
        <button
          onclick={closeEmailAlertsModal}
          class="text-text-muted hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p class="text-text-muted mb-6">
        Connect your Solana wallet to receive <strong class="text-white">free email alerts</strong> when we detect potential security issues with your wallet.
      </p>
      <div class="wallet-connect-modal">
        <p class="text-text-muted mb-4 text-center">
          Click the <strong class="text-white">"Get Email Alert"</strong> button in the navigation bar to connect your wallet and set up email alerts.
        </p>
        <button
          onclick={closeEmailAlertsModal}
          class="w-full px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .wallet-connect-modal {
    display: flex;
    justify-content: center;
  }
</style>

