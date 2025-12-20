<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    walletAddress: string;
    email: string | undefined;
    verified: boolean | undefined;
    onDisconnect: () => void;
  }

  let {
    walletAddress,
    email,
    verified,
    onDisconnect
  }: Props = $props();

  let isOpen = $state(false);
  let dropdownElement: HTMLDivElement = $state();

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function handleClickOutside(event: MouseEvent) {
    if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
      isOpen = false;
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
          <p class="text-xs text-text-muted mb-1">Wallet Address</p>
          <p class="text-sm font-mono text-white break-all">{walletAddress}</p>
        </div>

        {#if email}
          <div>
            <p class="text-xs text-text-muted mb-1">Email</p>
            <div class="flex items-center gap-2">
              <p class="text-sm text-white">{email}</p>
              {#if verified}
                <span class="text-xs text-green-400">✓ Verified</span>
              {:else}
                <span class="text-xs text-yellow-400">⚠ Unverified</span>
              {/if}
            </div>
          </div>
        {/if}

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

