<script lang="ts">
  import { onMount } from 'svelte';
  import ResultCard from './ResultCard.svelte';
  import { ApiClient, type RiskReport } from '@haveibeendrained/shared';

  const apiClient = new ApiClient({
    baseUrl: import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3001'
  });
  
  let address = '';
  let isLoading = false;
  let error = '';
  let showResults = false;
  let result: RiskReport | null = null;
  let includeExperimental = false;

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
    <div class="space-y-3">
    <div class="relative">
      <input
        type="text"
        bind:value={address}
        on:input={handleInput}
        placeholder="Enter Solana Wallet Address"
        class="w-full px-6 py-4 bg-surface border-2 border-slate-700 rounded-xl text-lg text-white placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
        class:border-red-500={error}
      />
      
      <button
        on:click={handleSubmit}
        disabled={!address.trim() || isLoading}
        class="absolute right-2 top-2 bottom-2 px-6 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
      >
        {#if isLoading}
          <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        {:else}
          Check
        {/if}
      </button>
    </div>
      
      <!-- Experimental Mode Toggle -->
      <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-white transition-colors">
        <input
          type="checkbox"
          bind:checked={includeExperimental}
          class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary focus:ring-2"
        />
        <span>
          <span class="font-medium">Experimental:</span> Include token & NFT detection
          <span class="text-xs text-slate-500 ml-1">(may be slower)</span>
        </span>
      </label>
    
    {#if error}
        <p class="text-red-400 text-sm text-center">{error}</p>
    {/if}
    </div>
  {:else if result}
    <div class="space-y-6">
      <ResultCard 
        riskScore={result.overallRisk}
        severity={result.severity}
        detections={result.detections}
        recommendations={result.recommendations}
        affectedAssets={result.affectedAssets}
      />
      
      <button 
        on:click={() => { 
          showResults = false; 
          address = ''; 
          error = '';
          result = null;
        }}
        class="w-full py-3 text-text-muted hover:text-white transition-colors"
      >
        Check Another Wallet
      </button>
    </div>
  {:else}
    <div class="text-center text-text-muted">No results to display.</div>
  {/if}
</div>
