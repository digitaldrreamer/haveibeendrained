# Astro Configuration & Performance Code Examples
## Implementation Guide for "Have I Been Drained"

---

## 1. OPTIMIZED ASTRO CONFIG

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';

export default defineConfig({
  // ─── BASIC SETUP ───
  site: 'https://haveibeedrained.com',
  base: '/', // URL base path if deployed to subdirectory
  trailingSlash: 'ignore', // Handle trailing slashes consistently
  
  // ─── OUTPUT CONFIGURATION ───
  output: 'hybrid', // Default to static, allow SSR for dynamic routes
  adapter: import.meta.env.PROD ? 'auto' : undefined,

  // ─── IMAGE OPTIMIZATION ───
  image: {
    // Use sharp for better compression than default
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: false, // Allow processing large images
      },
    },
    // CDN domains for external images
    domains: [
      'cdn.example.com',
      'images.example.com',
    ],
    // Generate multiple formats by default
    formats: ['image/avif', 'image/webp', 'image/jpeg'],
  },

  // ─── BUILD & VITE OPTIMIZATION ───
  vite: {
    build: {
      // Manual chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor bundles (cache-busted less frequently)
            'vendor-svelte': ['svelte'],
            'vendor-solana': ['@solana/web3.js', '@solana/spl-token'],
            'vendor-utils': ['lodash-es', 'date-fns'],
            
            // Feature-specific chunks
            'scanner': ['./src/components/WalletScanner.svelte'],
            'analysis': ['./src/components/RiskAnalysis.svelte'],
          },
        },
      },
      
      // Performance settings
      cssCodeSplit: true, // Separate CSS per chunk
      minify: 'terser', // Aggressive minification
      terserOptions: {
        compress: {
          drop_console: true, // Remove console in production
          passes: 2, // Multiple compression passes
        },
      },
      sourcemap: false, // Disable in production
      
      // Timeout for large builds
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },

    // CSS optimization
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
        },
      },
    },

    // Dependency optimization
    ssr: {
      // Pre-bundle these dependencies for faster startup
      noExternal: ['@solana/web3.js'],
    },
  },

  // ─── INTEGRATIONS ───
  integrations: [
    // Svelte framework (lightweight, perfect for islands)
    svelte({
      preprocess: [],
    }),

    // React for complex components (use sparingly)
    react({
      include: ['**/react/**'],
    }),

    // Automatic compression (gzip + brotli)
    compress({
      img: true, // Compress images
      svg: true, // Minify SVG
      js: true,
      css: true,
      html: false, // Astro handles HTML
    }),

    // Generate sitemap for SEO
    sitemap({
      filter: (page) => {
        // Exclude admin/private pages
        return !page.includes('/admin/') && !page.includes('/private/');
      },
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],

  // ─── PREFETCH & PRELOAD ───
  prefetch: {
    prefetchAll: true, // Prefetch all visible links
    defaultStrategy: 'tap', // Only prefetch on tap/hover
  },

  // ─── MARKDOWN & CONTENT ───
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'dracula',
      langs: [],
      transformers: [],
    },
  },

  // ─── CACHING HEADERS (for deployment) ───
  // These work with Vercel/Netlify automatic deployment
  headers: {
    '/*.js': { 'Cache-Control': 'public, max-age=31536000' },
    '/*.css': { 'Cache-Control': 'public, max-age=31536000' },
    '/*.woff2': { 'Cache-Control': 'public, max-age=31536000' },
    '/images/*': { 'Cache-Control': 'public, max-age=604800' },
    '/api/*': { 'Cache-Control': 'no-cache' },
  },
});
```

---

## 2. OPTIMIZED LAYOUT WITH CRITICAL CSS

```astro
// src/layouts/BaseLayout.astro
---
import '../styles/critical.css'; // Inlined critical CSS
import '../styles/fonts.css';

interface Props {
  title: string;
  description?: string;
  image?: string;
  article?: boolean;
}

const { 
  title, 
  description = 'Detect if your Solana wallet has been drained',
  image = 'https://cdn.example.com/og-image.png',
  article = false 
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content={description} />
  <meta name="theme-color" content="#000000" />

  <!-- Canonical URL -->
  <link rel="canonical" href={canonicalURL} />

  <!-- Preload critical resources -->
  <link
    rel="preload"
    href="/fonts/inter-regular.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />
  <link
    rel="preload"
    href="/fonts/inter-bold.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />

  <!-- Preconnect to external services -->
  <link rel="preconnect" href="https://api.mainnet-beta.solana.com" />
  <link rel="dns-prefetch" href="//www.google-analytics.com" />

  <!-- Open Graph / Social Media -->
  <meta property="og:type" content={article ? 'article' : 'website'} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={image} />
  <meta property="og:url" content={canonicalURL} />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image} />

  <title>{title}</title>

  <!-- Structured data for SEO -->
  <script type="application/ld+json" set:html={JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': 'Have I Been Drained',
    'description': 'Solana wallet security checker',
    'url': 'https://haveibeedrained.com',
    'applicationCategory': 'FinanceApplication',
  })} />

  <!-- Async scripts at end of head (before critical CSS) -->
  <link rel="stylesheet" href="/styles/main.css" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="/styles/main.css" /></noscript>
</head>

<body>
  <Header />
  <main id="main-content">
    <slot />
  </main>
  <Footer />

  <!-- Deferred non-critical CSS -->
  <link rel="stylesheet" href="/styles/animations.css" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="/styles/animations.css" /></noscript>
</body>
</html>

<style is:global>
  /* Reset and base styles (critical, inlined) */
  * {
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: var(--font-family);
    line-height: 1.6;
    color: var(--color-text);
    background: var(--color-bg);
  }

  main {
    min-height: 100vh;
  }
</style>

<style>
  /* These will be extracted to /styles/main.css and deferred */
  :root {
    --font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    --color-text: #1a1a1a;
    --color-bg: #ffffff;
    --color-primary: #6366f1;
  }
</style>
```

---

## 3. OPTIMIZED IMAGE COMPONENT

```astro
// src/components/OptimizedImage.astro
---
import { Picture, Image } from 'astro:assets';

interface Props {
  src: ImageMetadata;
  alt: string;
  width?: number;
  height?: number;
  title?: string;
  caption?: string;
  class?: string;
  priority?: boolean;
}

const { 
  src, 
  alt, 
  width = 800,
  height = 600,
  title,
  caption,
  class: className,
  priority = false
} = Astro.props;
---

<figure class={`image-container ${className || ''}`}>
  <Picture
    src={src}
    alt={alt}
    title={title}
    widths={[320, 640, 960, 1280, 1600]}
    formats={['avif', 'webp', 'png']}
    loading={priority ? 'eager' : 'lazy'}
    decoding={priority ? 'sync' : 'async'}
  />
  {caption && <figcaption>{caption}</figcaption>}
</figure>

<style>
  .image-container {
    margin: 0;
    padding: 0;
  }

  :global(picture) {
    display: block;
    width: 100%;
    height: auto;
  }

  :global(img) {
    width: 100%;
    height: auto;
    display: block;
  }

  figcaption {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    text-align: center;
  }
</style>
```

---

## 4. SVELTE ISLAND WITH LAZY HYDRATION

```svelte
<!-- src/components/WalletScanner.svelte -->
<script>
  import { debounce } from 'lodash-es';
  import { onMount } from 'svelte';

  let walletAddress = '';
  let isScanning = false;
  let results = null;
  let error = null;

  // Move heavy processing to Web Worker
  let worker;

  onMount(() => {
    // Initialize Web Worker for analysis
    worker = new Worker('/workers/wallet-analyzer.js');
    
    worker.onmessage = (e) => {
      results = e.data;
      isScanning = false;
    };

    return () => worker?.terminate();
  });

  const handleScan = debounce(async () => {
    if (!walletAddress.trim()) return;

    isScanning = true;
    error = null;

    try {
      // Validate address format first (fast)
      if (!isValidSolanaAddress(walletAddress)) {
        throw new Error('Invalid Solana wallet address');
      }

      // Send to Web Worker (doesn't block main thread)
      worker.postMessage({ address: walletAddress });
    } catch (err) {
      error = err.message;
      isScanning = false;
    }
  }, 500);

  function handleInput(e) {
    walletAddress = e.target.value;
    handleScan();
  }

  function isValidSolanaAddress(address) {
    // Quick validation (real validation in worker)
    return address.length === 44 && /^[1-9A-HJ-NP-Z]{44}$/.test(address);
  }
</script>

<div class="scanner-container">
  <h2>Wallet Security Scanner</h2>
  
  <div class="input-group">
    <input
      type="text"
      placeholder="Enter your Solana wallet address (base58)"
      value={walletAddress}
      on:input={handleInput}
      disabled={isScanning}
      aria-label="Wallet address input"
      aria-describedby="address-hint"
    />
    <button
      on:click={() => handleScan()}
      disabled={isScanning || !walletAddress}
      aria-busy={isScanning}
    >
      {isScanning ? 'Scanning...' : 'Scan Wallet'}
    </button>
  </div>

  {#if error}
    <div class="error-message" role="alert">
      <strong>Error:</strong> {error}
    </div>
  {/if}

  {#if isScanning}
    <div class="loading" aria-live="polite">
      Analyzing wallet transactions...
    </div>
  {/if}

  {#if results}
    <div class="results" transition:fade>
      <h3>Security Analysis Results</h3>
      <div class="result-grid">
        <div class="result-card">
          <span class="label">Risk Level</span>
          <span class="value risk-{results.riskLevel.toLowerCase()}">
            {results.riskLevel}
          </span>
        </div>
        <div class="result-card">
          <span class="label">Suspicious Activities</span>
          <span class="value">{results.suspiciousCount}</span>
        </div>
        <div class="result-card">
          <span class="label">Analysis Date</span>
          <span class="value">{new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  {/if}

  <p id="address-hint" class="hint">
    Enter a public Solana wallet address to check for drain activity
  </p>
</div>

<style>
  .scanner-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
    background: var(--color-surface);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  h2 {
    margin-top: 0;
    color: var(--color-primary);
  }

  .input-group {
    display: flex;
    gap: 0.5rem;
    margin: 1.5rem 0;
  }

  input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 2px solid var(--color-border);
    border-radius: 4px;
    font: inherit;
    font-size: 1rem;
  }

  input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  button {
    padding: 0.75rem 1.5rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: all 150ms;
  }

  button:hover:not(:disabled) {
    background: var(--color-primary-dark);
    transform: translateY(-2px);
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    padding: 1rem;
    background: #fee;
    border-left: 4px solid #c33;
    border-radius: 4px;
    color: #c33;
    margin: 1rem 0;
  }

  .loading {
    padding: 1rem;
    text-align: center;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .results {
    margin-top: 2rem;
  }

  .result-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  .result-card {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    background: var(--color-bg);
    border-radius: 6px;
    border: 1px solid var(--color-border);
    min-height: 80px;
  }

  .label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .value {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .risk-high {
    color: #c33;
  }

  .risk-medium {
    color: #f59;
  }

  .risk-low {
    color: #3a3;
  }

  .hint {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin-top: 1rem;
  }
</style>
```

---

## 5. SOLANA API INTEGRATION (Server Island)

```astro
// src/components/WalletDetails.astro
---
// This runs on the server only - ZERO JavaScript shipped
import { Connection, PublicKey } from '@solana/web3.js';

interface Props {
  address: string;
}

const { address } = Astro.props;

async function fetchWalletDetails(address: string) {
  try {
    const connection = new Connection(
      'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    const transactions = await connection.getSignaturesForAddress(publicKey, {
      limit: 10
    });

    return {
      balance: balance / 1e9, // Convert lamports to SOL
      transactionCount: transactions.length,
      lastTransaction: transactions[0]?.blockTime
        ? new Date(transactions[0].blockTime * 1000).toLocaleDateString()
        : 'N/A'
    };
  } catch (error) {
    console.error('Failed to fetch wallet details:', error);
    return null;
  }
}

const details = await fetchWalletDetails(address);
---

<div class="wallet-details">
  {details ? (
    <div class="details-content">
      <div class="detail-row">
        <span class="label">Balance (SOL)</span>
        <span class="value">{details.balance.toFixed(2)}</span>
      </div>
      <div class="detail-row">
        <span class="label">Transactions</span>
        <span class="value">{details.transactionCount}</span>
      </div>
      <div class="detail-row">
        <span class="label">Last Activity</span>
        <span class="value">{details.lastTransaction}</span>
      </div>
    </div>
  ) : (
    <div class="error">Failed to load wallet details</div>
  )}
</div>

<style>
  .wallet-details {
    padding: 1rem;
    background: var(--color-surface);
    border-radius: 6px;
    min-height: 150px;
  }

  .details-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .detail-row {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    background: var(--color-bg);
    border-radius: 4px;
  }

  .label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .error {
    padding: 1rem;
    color: #c33;
    text-align: center;
  }
</style>
```

---

## 6. LIGHTHOUSE BUDGET FILE

```json
// lighthouse-budget.json
{
  "version": 1.0,
  "budgets": [
    {
      "resourceType": "script",
      "budget": 150,
      "label": "JavaScript (KB)"
    },
    {
      "resourceType": "style",
      "budget": 50,
      "label": "CSS (KB)"
    },
    {
      "resourceType": "image",
      "budget": 200,
      "label": "Images (KB)"
    },
    {
      "resourceType": "font",
      "budget": 50,
      "label": "Fonts (KB)"
    },
    {
      "resourceType": "total",
      "budget": 500,
      "label": "Total Page Size (KB)"
    },
    {
      "resourceType": "third-party",
      "budget": 100,
      "label": "Third-party (KB)"
    },
    {
      "type": "largest-contentful-paint",
      "budget": 2500,
      "label": "LCP (ms)"
    },
    {
      "type": "interaction-to-next-paint",
      "budget": 200,
      "label": "INP (ms)"
    },
    {
      "type": "cumulative-layout-shift",
      "budget": 0.1,
      "label": "CLS"
    }
  ]
}
```

---

## 7. WEB WORKER FOR HEAVY COMPUTATION

```javascript
// public/workers/wallet-analyzer.js
// This runs in a separate thread - doesn't block UI

self.onmessage = async (event) => {
  const { address } = event.data;

  try {
    // Analyze wallet transactions for drain patterns
    const results = await analyzeWallet(address);
    self.postMessage(results);
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};

async function analyzeWallet(address) {
  // Simulate heavy computation (real implementation would fetch from API)
  
  // 1. Validate address format
  if (!validateAddress(address)) {
    throw new Error('Invalid Solana address');
  }

  // 2. Fetch transaction history (done in server component)
  // Would be too slow here, use API instead
  
  // 3. Analyze patterns (CPU-intensive)
  const analysis = {
    riskLevel: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW',
    suspiciousCount: Math.floor(Math.random() * 10),
    threatPatterns: detectPatterns(),
  };

  return analysis;
}

function validateAddress(address) {
  // Solana base58 validation
  const regex = /^[1-9A-HJ-NP-Z]{44}$/;
  return regex.test(address);
}

function detectPatterns() {
  // Complex pattern detection (normally takes 100ms+)
  return ['Sudden large transfers', 'Unexpected token sales'];
}
```

---

## 8. GITHUB ACTIONS: LIGHTHOUSE CI

```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build site
        run: |
          npm ci
          npm run build

      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          uploadArtifacts: true
          temporaryPublicStorage: true
          budgetPath: ./lighthouse-budget.json

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('./.lighthouse/manifest.json'));
            console.log('Lighthouse results:', report);
```

---

**End of Implementation Guide**