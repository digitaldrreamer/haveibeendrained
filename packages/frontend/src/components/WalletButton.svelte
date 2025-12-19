<script lang="ts">
  import { onMount } from 'svelte';
  import WalletConnectIsland from './WalletConnectIsland.astro';
  import ProfileDropdown from './ProfileDropdown.svelte';

  let walletAddress: string | null = null;
  let email: string | undefined;
  let verified: boolean | undefined;
  let isClient = false;

  onMount(() => {
    isClient = true;
    // Check localStorage for persisted wallet
    const stored = localStorage.getItem('wallet_alert_state');
    if (stored) {
      try {
        const state = JSON.parse(stored);
        walletAddress = state.walletAddress;
        email = state.email;
        verified = state.verified;
      } catch (e) {
        console.error('Failed to parse stored wallet state:', e);
      }
    }

    // Listen for wallet connection events
    const handleWalletConnected = (event: CustomEvent) => {
      const { walletAddress: addr, email: em } = event.detail;
      handleConnected(addr, em);
    };

    const handleWalletDisconnected = () => {
      handleDisconnected();
    };

    window.addEventListener('wallet-connected', handleWalletConnected as EventListener);
    window.addEventListener('wallet-disconnected', handleWalletDisconnected);

    return () => {
      window.removeEventListener('wallet-connected', handleWalletConnected as EventListener);
      window.removeEventListener('wallet-disconnected', handleWalletDisconnected);
    };
  });

  function handleConnected(address: string, userEmail?: string) {
    walletAddress = address;
    email = userEmail;
    verified = false; // Will be updated when status is checked
    localStorage.setItem('wallet_alert_state', JSON.stringify({ walletAddress: address, email: userEmail, verified: false }));
    
    // Check status to get verification state
    checkWalletStatus(address);
  }

  function handleDisconnected() {
    walletAddress = null;
    email = undefined;
    verified = undefined;
    localStorage.removeItem('wallet_alert_state');
  }

  async function checkWalletStatus(address: string) {
    const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3001';
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/internal/wallet-alerts/status?walletAddress=${address}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          email = data.email;
          verified = data.verified;
          localStorage.setItem('wallet_alert_state', JSON.stringify({ walletAddress: address, email: data.email, verified: data.verified }));
        }
      }
    } catch (err) {
      console.error('Failed to check wallet status:', err);
    }
  }
</script>

{#if isClient}
  {#if walletAddress}
    <ProfileDropdown
      {walletAddress}
      {email}
      {verified}
      onDisconnect={handleDisconnected}
    />
  {:else}
    <div class="wallet-button-wrapper">
      <WalletConnectIsland client:load />
    </div>
  {/if}
{/if}

<style>
  .wallet-button-wrapper {
    display: flex;
    align-items: center;
  }
</style>

