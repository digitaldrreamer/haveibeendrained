<script lang="ts">
  import { onMount } from 'svelte';
  import ResultCard from './ResultCard.svelte';
  import { ApiClient, type RiskReport } from '@haveibeendrained/shared';

  const apiClient = new ApiClient({
    baseUrl: import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3001'
  });
  
  let address = $state('');
  let isLoading = $state(false);
  let error = $state('');
  let showResults = $state(false);
  let result: RiskReport | null = $state(null);
  let includeExperimental = $state(false);

  function handleInput() {
    error = '';
  }

  async function handleSubmit() {
    if (!address.trim()) {
      return;
    }

    isLoading = true;
    error = '';
    showResults = false;
    result = null;

    const response = await apiClient.analyzeWallet({ 
      address: address.trim(),
      experimental: includeExperimental 
    });

    if (!response.success) {
      error = response.error || 'Unable to analyze wallet right now';
      isLoading = false;
      return;
    }

    result = response.data || null;
    showResults = !!result;
    isLoading = false;
  }

  // Read query parameter and auto-check on mount
  onMount(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const addressParam = urlParams.get('address');
      
      if (addressParam) {
        address = addressParam.trim();
        handleSubmit();
      }
    }
  });
</script>

<div class="w-full max-w-md mx-auto transition-all duration-500" class:max-w-2xl={showResults}>
  {#if !showResults}
    <div class="space-y-4">
    <div class="relative">
      <input
        type="text"
        bind:value={address}
        oninput={handleInput}
        placeholder="Enter Solana Wallet Address"
        class="w-full px-6 py-4 bg-surface border-4 border-black text-lg text-white placeholder-text-muted focus:outline-none focus:border-primary font-bold shadow-brutal-sm"
        class:border-danger={error}
      />
      
      <button
        onclick={handleSubmit}
        disabled={!address.trim() || isLoading}
        class="absolute right-2 top-2 bottom-2 px-6 bg-primary hover:bg-primary-hover text-white font-black border-4 border-black shadow-brutal-sm hover:shadow-brutal transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px] btn-brutal"
      >
        {#if isLoading}
          <div class="w-5 h-5 border-3 border-white border-t-transparent animate-spin"></div>
        {:else}
          Check
        {/if}
      </button>
    </div>
      
      <!-- Experimental Mode Toggle -->
      <label class="flex items-center gap-3 text-sm text-text-muted cursor-pointer hover:text-white transition-colors font-bold">
        <input
          type="checkbox"
          bind:checked={includeExperimental}
          class="w-5 h-5 border-3 border-black bg-surface text-primary focus:ring-2 focus:ring-primary accent-primary"
        />
        <span>
          <span class="font-black">Experimental:</span> Include token & NFT detection
          <span class="text-xs text-text-muted ml-1 font-normal">(may be slower)</span>
        </span>
      </label>
    
    {#if error}
        <p class="text-danger text-sm text-center font-black border-2 border-danger px-4 py-2 bg-danger/10">{error}</p>
    {/if}
    </div>
  {:else if result}
    <div class="space-y-6 pb-8">
      <ResultCard 
        riskScore={result.overallRisk}
        severity={result.severity}
        detections={result.detections}
        recommendations={result.recommendations}
        affectedAssets={result.affectedAssets}
      />
      
      <button 
        onclick={() => { 
          showResults = false; 
          address = ''; 
          error = '';
          result = null;
        }}
        class="w-full py-4 text-text-muted hover:text-white transition-colors font-black border-4 border-black bg-surface shadow-brutal-sm hover:shadow-brutal btn-brutal"
      >
        Check Another Wallet
      </button>
    </div>
  {:else}
    <div class="text-center text-text-muted font-bold">No results to display.</div>
  {/if}
</div>
