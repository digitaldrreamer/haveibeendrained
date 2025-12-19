<script lang="ts">
  export let riskScore: number = 0;
  export let severity: 'SAFE' | 'AT_RISK' | 'DRAINED' = 'SAFE';
  export let detections: any[] = [];
  export let recommendations: string[] = [];
  export let affectedAssets: { tokens: string[], nfts: string[], sol: number } = { tokens: [], nfts: [], sol: 0 };

  // Track expanded addresses per detection
  let expandedAddresses: Set<number> = new Set();

  // Helper function to format address (first 8 + last 4)
  function formatAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  }

  // Copy to clipboard function
  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  // Toggle expanded addresses for a detection
  function toggleAddresses(index: number) {
    if (expandedAddresses.has(index)) {
      expandedAddresses.delete(index);
    } else {
      expandedAddresses.add(index);
    }
    expandedAddresses = expandedAddresses; // Trigger reactivity
  }

  $: severityColor = 
    severity === 'SAFE' ? 'text-green-400' :
    severity === 'AT_RISK' ? 'text-yellow-400' :
    'text-red-500';
    
  $: borderColor = 
    severity === 'SAFE' ? 'border-green-500/50' :
    severity === 'AT_RISK' ? 'border-yellow-500/50' :
    'border-red-500/50';

  $: bgGradient = 
    severity === 'SAFE' ? 'from-green-500/10 to-transparent' :
    severity === 'AT_RISK' ? 'from-yellow-500/10 to-transparent' :
    'from-red-500/10 to-transparent';

  $: hasAffectedAssets = affectedAssets.tokens.length > 0 || affectedAssets.nfts.length > 0 || affectedAssets.sol > 0;
</script>

<div class="w-full max-w-2xl mx-auto bg-surface border {borderColor} rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
  <!-- Header / Risk Score -->
  <div class="p-8 bg-gradient-to-b {bgGradient} text-center relative">
    <div class="text-sm uppercase tracking-wider text-text-muted mb-2">Security Status</div>
    <h2 class="text-4xl font-bold {severityColor} mb-4">{severity.replace('_', ' ')}</h2>
    
    <div class="relative w-32 h-32 mx-auto flex items-center justify-center">
      <!-- Circular Progress (Simplified CSS) -->
      <svg class="w-full h-full transform -rotate-90">
        <circle cx="64" cy="64" r="60" stroke="currentColor" stroke-width="8" fill="transparent" class="text-slate-700" />
        <circle cx="64" cy="64" r="60" stroke="currentColor" stroke-width="8" fill="transparent" class="{severityColor}" 
          stroke-dasharray="{2 * Math.PI * 60}" 
          stroke-dashoffset="{2 * Math.PI * 60 * (1 - riskScore / 100)}" 
          stroke-linecap="round"
        />
      </svg>
      <div class="absolute inset-0 flex items-center justify-center text-3xl font-bold">
        {riskScore}
      </div>
    </div>
  </div>

  <!-- Detections List -->
  {#if detections.length > 0}
    <div class="p-6 border-t border-slate-700/50">
      <h3 class="text-lg font-semibold mb-4 text-white">Threats Detected</h3>
      <div class="space-y-3">
        {#each detections as detection, index}
          <div class="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div class="flex items-start gap-3">
            <span class="text-2xl">
              {detection.severity === 'CRITICAL' ? '🔴' : detection.severity === 'HIGH' ? '🟠' : '🟡'}
            </span>
              <div class="flex-1 space-y-2">
              <div class="font-medium text-white">{detection.type.replace('_', ' ')}</div>
                
                {#if detection.suspiciousRecipients?.length}
                  <div class="text-sm text-text-muted">
                    <span>Interaction with:</span>
                    <div class="mt-1 space-y-1">
                      {#if detection.suspiciousRecipients.length === 1}
                        <!-- Single address -->
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-mono text-white">
                            {formatAddress(detection.suspiciousRecipients[0])}
                          </span>
                          <button
                            on:click={() => copyAddress(detection.suspiciousRecipients[0])}
                            class="text-primary hover:text-primary-hover text-xs px-2 py-1 rounded border border-primary/50 hover:border-primary transition-colors"
                            title="Copy full address"
                          >
                            Copy
                          </button>
                          <a
                            href="https://solana.fm/address/{detection.suspiciousRecipients[0]}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-primary hover:text-primary-hover text-xs underline"
                          >
                            View on SolanaFM
                          </a>
                        </div>
                      {:else}
                        <!-- Multiple addresses -->
                        <div class="space-y-1">
                          <!-- First address (always shown) -->
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-mono text-white">
                              {formatAddress(detection.suspiciousRecipients[0])}
                            </span>
                            <button
                              on:click={() => copyAddress(detection.suspiciousRecipients[0])}
                              class="text-primary hover:text-primary-hover text-xs px-2 py-1 rounded border border-primary/50 hover:border-primary transition-colors"
                              title="Copy full address"
                            >
                              Copy
                            </button>
                            <a
                              href="https://solana.fm/address/{detection.suspiciousRecipients[0]}"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-primary hover:text-primary-hover text-xs underline"
                            >
                              View on SolanaFM
                            </a>
                          </div>
                          
                          {#if expandedAddresses.has(index)}
                            <!-- Expanded: Show all addresses -->
                            {#each detection.suspiciousRecipients.slice(1) as addr}
                              <div class="flex items-center gap-2 flex-wrap pl-4 border-l-2 border-slate-700">
                                <span class="font-mono text-white">
                                  {formatAddress(addr)}
                                </span>
                                <button
                                  on:click={() => copyAddress(addr)}
                                  class="text-primary hover:text-primary-hover text-xs px-2 py-1 rounded border border-primary/50 hover:border-primary transition-colors"
                                  title="Copy full address"
                                >
                                  Copy
                                </button>
                                <a
                                  href="https://solana.fm/address/{addr}"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="text-primary hover:text-primary-hover text-xs underline"
                                >
                                  View on SolanaFM
                                </a>
                              </div>
                            {/each}
                            <button
                              on:click={() => toggleAddresses(index)}
                              class="text-primary hover:text-primary-hover text-xs mt-1 underline"
                            >
                              Show less
                            </button>
                          {:else}
                            <!-- Collapsed: Show "and X other addresses" -->
                            <button
                              on:click={() => toggleAddresses(index)}
                              class="text-primary hover:text-primary-hover text-xs underline"
                            >
                              and {detection.suspiciousRecipients.length - 1} other address{detection.suspiciousRecipients.length - 1 > 1 ? 'es' : ''}
                            </button>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}
                
                {#if detection.domains && detection.domains.length > 0}
                  <div class="text-sm text-text-muted mt-2">
                    <span class="font-medium">Associated domains:</span>
                    <div class="mt-1 space-y-1">
                      {#each detection.domains as domain}
                        <div class="flex items-center gap-2">
                          <a
                            href={domain}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-primary hover:text-primary-hover text-xs underline break-all"
                          >
                            {domain}
                          </a>
                          <button
                            on:click={() => copyAddress(domain)}
                            class="text-primary hover:text-primary-hover text-xs px-2 py-1 rounded border border-primary/50 hover:border-primary transition-colors"
                            title="Copy domain"
                          >
                            Copy
                          </button>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
                
                {#if detection.signature}
                  <div class="text-sm text-text-muted mt-2 flex items-center gap-2">
                    <span>Transaction:</span>
                    <a
                      href="https://solana.fm/tx/{detection.signature}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary hover:text-primary-hover font-mono text-xs underline"
                    >
                      {formatAddress(detection.signature)}
                    </a>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Affected Assets -->
  {#if hasAffectedAssets}
    <div class="p-6 border-t border-slate-700/50">
      <h3 class="text-lg font-semibold mb-4 text-white">Affected Assets</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#if affectedAssets.sol > 0}
          <div class="p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-center">
            <div class="text-2xl mb-2">💰</div>
            <div class="font-medium text-white">SOL</div>
            <div class="text-lg text-primary">{affectedAssets.sol.toFixed(4)}</div>
          </div>
        {/if}
        {#if affectedAssets.tokens.length > 0}
          <div class="p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-center">
            <div class="text-2xl mb-2">🪙</div>
            <div class="font-medium text-white">Tokens</div>
            <div class="text-lg text-primary">{affectedAssets.tokens.length}</div>
            <div class="text-xs text-text-muted mt-1">
              {affectedAssets.tokens.slice(0, 2).join(', ')}
              {#if affectedAssets.tokens.length > 2}
                +{affectedAssets.tokens.length - 2} more
              {/if}
            </div>
          </div>
        {/if}
        {#if affectedAssets.nfts.length > 0}
          <div class="p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-center">
            <div class="text-2xl mb-2">🎨</div>
            <div class="font-medium text-white">NFTs</div>
            <div class="text-lg text-primary">{affectedAssets.nfts.length}</div>
            <div class="text-xs text-text-muted mt-1">
              {affectedAssets.nfts.slice(0, 2).join(', ')}
              {#if affectedAssets.nfts.length > 2}
                +{affectedAssets.nfts.length - 2} more
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Recommendations -->
  {#if recommendations.length > 0}
    <div class="p-6 border-t border-slate-700/50 bg-slate-900/30">
      <h3 class="text-lg font-semibold mb-4 text-white">Recommended Actions</h3>
      <ul class="space-y-2">
        {#each recommendations as rec}
          <li class="flex items-start gap-2 text-sm text-slate-300">
            <span class="text-primary mt-1">➜</span>
            <span>{rec}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  
  <!-- Share / Action Buttons -->
  <div class="p-6 border-t border-slate-700/50 flex justify-center gap-4">
    <button class="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors">
      Share Result
    </button>
    {#if severity !== 'SAFE'}
      <a href="https://solrevoke.cash" target="_blank" rel="noopener noreferrer" class="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors">
        Revoke Approvals
      </a>
    {/if}
  </div>
</div>
