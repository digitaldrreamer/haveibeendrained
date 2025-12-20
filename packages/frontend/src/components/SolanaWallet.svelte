<script lang="ts">
  import { clusterApiUrl, Connection } from '@solana/web3.js';
  import {
    WalletProvider,
    ConnectionProvider,
    WalletMultiButton,
  } from '@svelte-on-solana/wallet-adapter-ui';
  import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
  } from '@solana/wallet-adapter-wallets';
  import { walletStore } from '@svelte-on-solana/wallet-adapter-core';
  import '@svelte-on-solana/wallet-adapter-ui/styles.css';
  import bs58 from 'bs58';

  // * Props for callbacks
  interface Props {
    onConnected?: (walletAddress: string, email?: string) => void;
    onDisconnected?: () => void;
  }

  let { onConnected, onDisconnected }: Props = $props();

  // * Configuration
  const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const SOLANA_NETWORK = import.meta.env.PUBLIC_SOLANA_NETWORK || 'devnet';
  const network = clusterApiUrl(SOLANA_NETWORK);

  // * State
  // * Initialize wallets immediately (not in onMount) so WalletProvider has them on first render
  let wallets: any[] = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ];
  let isVerifying = $state(false);
  let email = $state('');
  let showEmailInput = $state(false);
  let error = $state<string | null>(null);
  let walletStatus = $state<{
    exists: boolean;
    email?: string;
    verified?: boolean;
  } | null>(null);

  // * Track previous connected state to detect disconnects
  let wasConnected = false;
  let lastPublicKey: string | null = null;

  // * Check wallet status when connected, handle disconnect
  $effect(() => {
    if ($walletStore?.connected && $walletStore?.publicKey) {
      wasConnected = true;
      lastPublicKey = $walletStore.publicKey.toBase58();
      checkWalletStatus();
    } else if (wasConnected && !$walletStore?.connected && lastPublicKey) {
      // * Wallet was disconnected - try to notify backend (may fail if wallet already disconnected)
      const disconnectedAddress = lastPublicKey;
      wasConnected = false;
      lastPublicKey = null;
      walletStatus = null;
      email = '';
      showEmailInput = false;
      localStorage.removeItem('wallet_alert_state');
      
      // * Try to notify backend (may fail if wallet is already disconnected and can't sign)
      handleDisconnect(disconnectedAddress).catch(err => {
        console.warn('Backend disconnect notification failed (wallet already disconnected):', err);
      });
      
      window.dispatchEvent(new CustomEvent('wallet-disconnected'));
      onDisconnected?.();
    } else {
      walletStatus = null;
      showEmailInput = false;
    }
  });

  // * Check wallet status from backend
  async function checkWalletStatus() {
    if (!$walletStore?.publicKey) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/internal/wallet-alerts/status?walletAddress=${$walletStore.publicKey.toBase58()}`
      );

      if (response.ok) {
        const data = await response.json();
        walletStatus = data;
        if (data.exists && data.email) {
          email = data.email;
          onConnected?.($walletStore.publicKey.toBase58(), data.email);
        } else {
          showEmailInput = true;
        }
      }
    } catch (err) {
      console.error('Failed to check wallet status:', err);
    }
  }

  // * Handle wallet verification
  async function handleVerify() {
    if (!$walletStore?.publicKey || !$walletStore?.signMessage) {
      error = 'Wallet not connected';
      return;
    }

    if (!email || !email.includes('@')) {
      error = 'Please enter a valid email address';
      return;
    }

    isVerifying = true;
    error = null;

    try {
      // * Request nonce
      const nonceResponse = await fetch(
        `${API_BASE_URL}/api/internal/wallet-alerts/nonce?walletAddress=${$walletStore.publicKey.toBase58()}`
      );

      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce');
      }

      const { nonce } = await nonceResponse.json();

      // * Sign nonce
      const message = new TextEncoder().encode(nonce);
      const signature = await $walletStore.signMessage(message);

      // * Encode signature to base58
      const signatureBase58 = bs58.encode(signature);

      // * Verify with backend
      const verifyResponse = await fetch(`${API_BASE_URL}/api/internal/wallet-alerts/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: $walletStore.publicKey.toBase58(),
          signature: signatureBase58,
          nonce,
          email,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.message || 'Verification failed');
      }

      const verifyData = await verifyResponse.json();
      walletStatus = { exists: true, email, verified: false };
      showEmailInput = false;
      
      // * Update localStorage for other components
      localStorage.setItem('wallet_alert_state', JSON.stringify({
        walletAddress: $walletStore.publicKey.toBase58(),
        email,
        verified: false,
      }));
      
      // * Emit custom event
      window.dispatchEvent(new CustomEvent('wallet-connected', {
        detail: { walletAddress: $walletStore.publicKey.toBase58(), email }
      }));
      
      onConnected?.($walletStore.publicKey.toBase58(), email);
      alert('Wallet registered! Please check your email to verify your address.');
    } catch (err: any) {
      error = err.message || 'Failed to verify wallet';
      console.error('Verification error:', err);
    } finally {
      isVerifying = false;
    }
  }

  // * Handle wallet disconnect notification to backend
  // * Note: This may fail if called after wallet is already disconnected (can't sign)
  async function handleDisconnect(walletAddress: string) {
    // * If wallet is still connected, try to sign and notify backend
    if ($walletStore?.connected && $walletStore?.publicKey && $walletStore?.signMessage) {
      try {
        // * Request nonce for disconnect
        const nonceResponse = await fetch(
          `${API_BASE_URL}/api/internal/wallet-alerts/nonce?walletAddress=${walletAddress}`
        );

        if (!nonceResponse.ok) {
          throw new Error('Failed to get nonce');
        }

        const { nonce } = await nonceResponse.json();

        // * Sign nonce
        const message = new TextEncoder().encode(nonce);
        const signature = await $walletStore.signMessage(message);
        const signatureBase58 = bs58.encode(signature);

        // * Disconnect from backend
        await fetch(`${API_BASE_URL}/api/internal/wallet-alerts/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress,
            signature: signatureBase58,
            nonce,
          }),
        });
      } catch (err) {
        // * If signing fails (wallet already disconnected), that's okay
        throw err;
      }
    }
    // * If wallet is already disconnected, we can't sign, so skip backend notification
  }
</script>

<!-- * Initialize wallet and connection providers (they don't wrap children) -->
<WalletProvider {wallets} autoConnect localStorageKey="wallet-adapter" />
<ConnectionProvider {network} />

{#if !$walletStore?.connected}
  <div class="wallet-connect-container">
    <WalletMultiButton />
  </div>
{:else}
  <div class="wallet-connect-container">
    {#if showEmailInput && !walletStatus?.exists}
      <div class="email-input-container space-y-3">
        <div>
          <label for="email" class="block text-sm font-medium text-text-muted mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="your@email.com"
            class="w-full px-4 py-2 bg-surface border-2 border-slate-700 rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary"
          />
          <p class="text-xs text-text-muted mt-1">
            We'll send you free email alerts if your wallet is compromised
          </p>
        </div>
        {#if error}
          <p class="text-red-400 text-sm">{error}</p>
        {/if}
        <button
          onclick={handleVerify}
          disabled={isVerifying || !email}
          class="w-full px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? 'Verifying...' : 'Register Email Alerts'}
        </button>
      </div>
    {:else}
      <div class="wallet-status">
        <WalletMultiButton />
        {#if walletStatus?.exists}
          <div class="mt-2 text-sm text-text-muted">
            {#if walletStatus.verified}
              <span class="text-green-400">✓ Email verified</span>
            {:else}
              <span class="text-yellow-400">⚠ Check email to verify</span>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  .wallet-connect-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .email-input-container {
    min-width: 300px;
    max-width: 400px;
  }

  .wallet-status {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>

