<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { walletStore } from '@svelte-on-solana/wallet-adapter-core';
  import bs58 from 'bs58';

  interface Props {
    walletAddress: string;
    email: string | undefined;
    verified: boolean | undefined;
    onDisconnect: () => void;
    onEmailUpdated?: (email: string) => void;
  }

  let {
    walletAddress,
    email,
    verified,
    onDisconnect,
    onEmailUpdated
  }: Props = $props();

  let isOpen = $state(false);
  let dropdownElement: HTMLDivElement | undefined = $state();
  let showEmailForm = $state(false);
  let emailInput = $state('');
  let isVerifying = $state(false);
  let error = $state<string | null>(null);

  const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3001';

  function toggleDropdown() {
    isOpen = !isOpen;
    if (!isOpen) {
      showEmailForm = false;
      emailInput = '';
      error = null;
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
      isOpen = false;
      showEmailForm = false;
      emailInput = '';
      error = null;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });

  function truncateAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  }

  function openEmailForm() {
    showEmailForm = true;
    emailInput = email || '';
    error = null;
  }

  async function handleEmailRegister() {
    if (!$walletStore?.publicKey || !$walletStore?.signMessage) {
      error = 'Wallet not connected';
      return;
    }

    if (!emailInput || !emailInput.includes('@')) {
      error = 'Please enter a valid email address';
      return;
    }

    isVerifying = true;
    error = null;

    try {
      // * Request nonce
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

      // * Encode signature to base58
      const signatureBase58 = bs58.encode(signature);

      // * Verify with backend
      const verifyResponse = await fetch(`${API_BASE_URL}/api/internal/wallet-alerts/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          signature: signatureBase58,
          nonce,
          email: emailInput,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.message || 'Verification failed');
      }

      // * Update localStorage
      localStorage.setItem('wallet_alert_state', JSON.stringify({
        walletAddress,
        email: emailInput,
        verified: false,
      }));

      // * Emit custom event to update other components
      window.dispatchEvent(new CustomEvent('wallet-connected', {
        detail: { walletAddress, email: emailInput }
      }));

      // * Notify parent component of email update
      onEmailUpdated?.(emailInput);

      // * Close form and show success
      showEmailForm = false;
      alert('Email registered! Please check your inbox to verify your address.');
    } catch (err: any) {
      error = err.message || 'Failed to register email';
      console.error('Email registration error:', err);
    } finally {
      isVerifying = false;
    }
  }

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress);
    // * You could add a toast notification here if desired
  }
</script>

<div class="relative" bind:this={dropdownElement}>
  <button
    onclick={toggleDropdown}
    class="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-slate-700 text-white rounded-lg border border-slate-600 transition-colors"
  >
    <span class="text-sm font-medium">{truncateAddress(walletAddress)}</span>
    <svg
      class="w-4 h-4 transition-transform"
      class:rotate-180={isOpen}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if isOpen}
    <div
      class="absolute right-0 mt-2 w-64 bg-surface border border-slate-600 rounded-lg shadow-lg z-50"
      transition:fade={{ duration: 150 }}
    >
      <div class="p-4 space-y-3">
        <div>
          <div class="flex items-center justify-between mb-1">
            <p class="text-xs text-text-muted">Wallet Address</p>
            <button
              onclick={copyAddress}
              class="text-xs text-primary hover:text-primary-hover transition-colors"
              title="Copy address"
            >
              Copy
            </button>
          </div>
          <p class="text-sm font-mono text-white break-all">{walletAddress}</p>
        </div>

        {#if showEmailForm}
          <div class="space-y-2 pt-2 border-t border-slate-600">
            <div>
              <label for="email-input" class="block text-xs text-text-muted mb-1">
                Email Address
              </label>
              <input
                id="email-input"
                type="email"
                bind:value={emailInput}
                placeholder="your@email.com"
                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary"
                disabled={isVerifying}
              />
              <p class="text-xs text-text-muted mt-1">
                We'll send you free email alerts if your wallet is compromised
              </p>
            </div>
            {#if error}
              <p class="text-xs text-red-400">{error}</p>
            {/if}
            <div class="flex gap-2">
              <button
                onclick={handleEmailRegister}
                disabled={isVerifying || !emailInput}
                class="flex-1 px-3 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Registering...' : 'Register Email'}
              </button>
              <button
                onclick={() => {
                  showEmailForm = false;
                  emailInput = '';
                  error = null;
                }}
                class="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded transition-colors"
                disabled={isVerifying}
              >
                Cancel
              </button>
            </div>
          </div>
        {:else}
          {#if email}
            <div>
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs text-text-muted">Email</p>
                <button
                  onclick={openEmailForm}
                  class="text-xs text-primary hover:text-primary-hover transition-colors"
                  title="Update email"
                >
                  Update
                </button>
              </div>
              <div class="flex items-center gap-2">
                <p class="text-sm text-white">{email}</p>
                {#if verified}
                  <span class="text-xs text-green-400">✓ Verified</span>
                {:else}
                  <span class="text-xs text-yellow-400">⚠ Unverified</span>
                {/if}
              </div>
            </div>
          {:else}
            <div class="pt-2 border-t border-slate-600">
              <p class="text-xs text-text-muted mb-2">No email alerts registered</p>
              <button
                onclick={openEmailForm}
                class="w-full px-3 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded transition-colors"
              >
                Register Email Alerts
              </button>
            </div>
          {/if}
        {/if}

        <div class="pt-2 border-t border-slate-600">
          <button
            onclick={() => {
              onDisconnect();
              isOpen = false;
            }}
            class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.wallet-adapter-button) {
    background-color: var(--color-primary) !important;
    color: white !important;
    border-radius: 0.5rem !important;
    font-weight: 600 !important;
  }

  :global(.wallet-adapter-button:hover) {
    background-color: var(--color-primary-hover) !important;
  }
</style>

