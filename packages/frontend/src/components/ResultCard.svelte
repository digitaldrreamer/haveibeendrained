<script lang="ts">
  interface Props {
    riskScore?: number;
    severity?: 'SAFE' | 'AT_RISK' | 'DRAINED';
    detections?: any[];
    recommendations?: string[];
    affectedAssets?: { tokens: string[], nfts: string[], sol: number };
  }

  let {
    riskScore = 0,
    severity = 'SAFE',
    detections = [],
    recommendations = [],
    affectedAssets = { tokens: [], nfts: [], sol: 0 }
  }: Props = $props();

  // Track expanded addresses per detection
  let expandedAddresses: Set<number> = $state(new Set());

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

  let severityColor = 
    $derived(severity === 'SAFE' ? 'text-green-400' :
    severity === 'AT_RISK' ? 'text-yellow-400' :
    'text-red-500');
    
  let borderColor = 
    $derived(severity === 'SAFE' ? 'border-success' :
    severity === 'AT_RISK' ? 'border-warning' :
    'border-danger');
    
  let shadowColor = 
    $derived(severity === 'SAFE' ? 'shadow-brutal-success' :
    severity === 'AT_RISK' ? 'shadow-brutal' :
    'shadow-brutal-danger');

  let bgGradient = 
    $derived(severity === 'SAFE' ? 'from-green-500/10 to-transparent' :
    severity === 'AT_RISK' ? 'from-yellow-500/10 to-transparent' :
    'from-red-500/10 to-transparent');

  let hasAffectedAssets = $derived(affectedAssets.tokens.length > 0 || affectedAssets.nfts.length > 0 || affectedAssets.sol > 0);
</script>

<div class="w-full max-w-2xl mx-auto bg-surface border-4 {borderColor} overflow-hidden {shadowColor} card-brutal mb-8 break-words">
  <!-- Header / Risk Score -->
  <div class="p-8 bg-gradient-to-b {bgGradient} text-center relative border-b-4 border-black">
    <div class="text-sm uppercase tracking-wider text-text-muted mb-2 font-black">Security Status</div>
    <h2 class="text-5xl font-black {severityColor} mb-4 uppercase">{severity.replace('_', ' ')}</h2>
    
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
      <div class="absolute inset-0 flex items-center justify-center text-4xl font-black">
        {riskScore}
      </div>
    </div>
  </div>

  <!-- Detections List -->
  {#if detections.length > 0}
    <div class="p-6 border-t-4 border-black">
      <h3 class="text-xl font-black mb-4 text-white uppercase tracking-wide">Threats Detected</h3>
      <div class="space-y-4">
        {#each detections as detection, index}
          <div class="p-4 bg-surface-elevated border-3 border-black shadow-brutal-sm">
            <div class="flex items-start gap-3">
            <span class="text-2xl">
              {detection.severity === 'CRITICAL' ? '🔴' : detection.severity === 'HIGH' ? '🟠' : '🟡'}
            </span>
              <div class="flex-1 space-y-2">
              <div class="font-black text-white text-lg uppercase">{detection.type.replace('_', ' ')}</div>
                
                {#if detection.suspiciousRecipients?.length}
                  <div class="text-sm text-text-muted">
                    <span>Interaction with:</span>
                    <div class="mt-1 space-y-1">
                      {#if detection.suspiciousRecipients.length === 1}
                        <!-- Single address -->
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-mono text-white break-all break-words max-w-full">
                            {formatAddress(detection.suspiciousRecipients[0])}
                          </span>
                          <button
                            onclick={() => copyAddress(detection.suspiciousRecipients[0])}
                            class="text-primary hover:text-primary-hover text-xs px-3 py-1 border-2 border-black bg-surface font-black shadow-brutal-sm hover:shadow-brutal btn-brutal"
                            title="Copy full address"
                          >
                            Copy
                          </button>
                          <a
                            href="https://solana.fm/address/{detection.suspiciousRecipients[0]}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-block"
                            title="View on SolanaFM"
                          >
                            <img src="https://off-chain.haveibeendrained.org/solanafm.png" alt="SolanaFM" class="h-4 w-auto" />
                          </a>
                          <a
                            href="https://chainabuse.com/address/{detection.suspiciousRecipients[0]}?chain=SOL"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-block"
                            title="View on ChainAbuse"
                          >
                            <img src="https://off-chain.haveibeendrained.org/chainabuse.png" alt="ChainAbuse" class="h-4 w-auto" />
                          </a>
                        </div>
                      {:else}
                        <!-- Multiple addresses -->
                        <div class="space-y-1">
                          <!-- First address (always shown) -->
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-mono text-white break-all break-words max-w-full">
                              {formatAddress(detection.suspiciousRecipients[0])}
                            </span>
                            <button
                              onclick={() => copyAddress(detection.suspiciousRecipients[0])}
                              class="text-primary hover:text-primary-hover text-xs px-3 py-1 border-2 border-black bg-surface font-black shadow-brutal-sm hover:shadow-brutal btn-brutal"
                              title="Copy full address"
                            >
                              Copy
                            </button>
                            <a
                              href="https://solana.fm/address/{detection.suspiciousRecipients[0]}"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="inline-block"
                              title="View on SolanaFM"
                            >
                              <img src="https://off-chain.haveibeendrained.org/solanafm.png" alt="SolanaFM" class="h-4 w-auto" />
                            </a>
                            <a
                              href="https://chainabuse.com/address/{detection.suspiciousRecipients[0]}?chain=SOL"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="inline-block"
                              title="View on ChainAbuse"
                            >
                              <img src="https://off-chain.haveibeendrained.org/chainabuse.png" alt="ChainAbuse" class="h-4 w-auto" />
                            </a>
                          </div>
                          
                          {#if expandedAddresses.has(index)}
                            <!-- Expanded: Show all addresses -->
                            {#each detection.suspiciousRecipients.slice(1) as addr}
                              <div class="flex items-center gap-2 flex-wrap pl-4 border-l-4 border-black">
                                <span class="font-mono text-white break-all break-words max-w-full">
                                  {formatAddress(addr)}
                                </span>
                                <button
                                  onclick={() => copyAddress(addr)}
                                  class="text-primary hover:text-primary-hover text-xs px-3 py-1 border-2 border-black bg-surface font-black shadow-brutal-sm hover:shadow-brutal btn-brutal"
                                  title="Copy full address"
                                >
                                  Copy
                                </button>
                                <a
                                  href="https://solana.fm/address/{addr}"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="inline-block"
                                  title="View on SolanaFM"
                                >
                                  <img src="https://off-chain.haveibeendrained.org/solanafm.png" alt="SolanaFM" class="h-4 w-auto" />
                                </a>
                                <a
                                  href="https://chainabuse.com/address/{addr}?chain=SOL"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="inline-block"
                                  title="View on ChainAbuse"
                                >
                                  <img src="https://off-chain.haveibeendrained.org/chainabuse.png" alt="ChainAbuse" class="h-4 w-auto" />
                                </a>
                              </div>
                            {/each}
                            <button
                              onclick={() => toggleAddresses(index)}
                              class="text-primary hover:text-primary-hover text-xs mt-1 underline"
                            >
                              Show less
                            </button>
                          {:else}
                            <!-- Collapsed: Show "and X other addresses" -->
                            <button
                              onclick={() => toggleAddresses(index)}
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
                            onclick={() => copyAddress(domain)}
                            class="text-primary hover:text-primary-hover text-xs px-3 py-1 border-2 border-black bg-surface font-black shadow-brutal-sm hover:shadow-brutal btn-brutal"
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
                      class="inline-flex items-center gap-2 font-mono text-xs break-all break-words max-w-full"
                      title="View transaction on SolanaFM"
                    >
                      <span class="text-primary hover:text-primary-hover underline">{formatAddress(detection.signature)}</span>
                      <img src="https://off-chain.haveibeendrained.org/solanafm.png" alt="SolanaFM" class="h-4 w-auto" />
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
    <div class="p-6 border-t-4 border-black">
      <h3 class="text-xl font-black mb-4 text-white uppercase tracking-wide">Affected Assets</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#if affectedAssets.sol > 0}
          <div class="p-4 bg-surface-elevated border-3 border-black shadow-brutal-sm text-center">
            <div class="text-2xl mb-2">💰</div>
            <div class="font-black text-white uppercase">SOL</div>
            <div class="text-xl text-primary font-black">{affectedAssets.sol.toFixed(4)}</div>
          </div>
        {/if}
        {#if affectedAssets.tokens.length > 0}
          <div class="p-4 bg-surface-elevated border-3 border-black shadow-brutal-sm text-center">
            <div class="text-2xl mb-2">🪙</div>
            <div class="font-black text-white uppercase">Tokens</div>
            <div class="text-xl text-primary font-black">{affectedAssets.tokens.length}</div>
            <div class="text-xs text-text-muted mt-1 space-y-1">
              {#each affectedAssets.tokens.slice(0, 2) as token}
                <div class="font-mono break-all break-words overflow-hidden text-ellipsis max-w-full" title={token}>
                  {token}
                </div>
              {/each}
              {#if affectedAssets.tokens.length > 2}
                <div class="mt-1 font-bold">+{affectedAssets.tokens.length - 2} more</div>
              {/if}
            </div>
          </div>
        {/if}
        {#if affectedAssets.nfts.length > 0}
          <div class="p-4 bg-surface-elevated border-3 border-black shadow-brutal-sm text-center">
            <div class="text-2xl mb-2">🎨</div>
            <div class="font-black text-white uppercase">NFTs</div>
            <div class="text-xl text-primary font-black">{affectedAssets.nfts.length}</div>
            <div class="text-xs text-text-muted mt-1 space-y-1">
              {#each affectedAssets.nfts.slice(0, 2) as nft}
                <div class="font-mono break-all break-words overflow-hidden text-ellipsis max-w-full" title={nft}>
                  {nft}
                </div>
              {/each}
              {#if affectedAssets.nfts.length > 2}
                <div class="mt-1 font-bold">+{affectedAssets.nfts.length - 2} more</div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Recommendations -->
  {#if recommendations.length > 0}
    <div class="p-6 border-t-4 border-black bg-surface-elevated">
      <h3 class="text-xl font-black mb-4 text-white uppercase tracking-wide">Recommended Actions</h3>
      <ul class="space-y-3">
        {#each recommendations as rec}
          <li class="flex items-start gap-3 text-sm text-white font-bold">
            <span class="text-primary mt-1 font-black text-lg">➜</span>
            <span>{rec}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  
  <!-- Share / Action Buttons -->
  <div class="p-6 border-t-4 border-black flex justify-center gap-4">
    <button class="px-6 py-3 bg-surface-elevated hover:bg-surface border-4 border-black text-white font-black shadow-brutal-sm hover:shadow-brutal btn-brutal">
      Share Result
    </button>
    {#if severity !== 'SAFE'}
      <a href="https://solrevoker.com" target="_blank" rel="noopener noreferrer" class="px-6 py-3 bg-primary hover:bg-primary-hover text-white border-4 border-black font-black shadow-brutal-sm hover:shadow-brutal btn-brutal">
        Revoke Approvals
      </a>
    {/if}
  </div>
</div>
