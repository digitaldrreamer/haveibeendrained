# Frontend Performance Optimization for Fast Load Times
## Research Document for "Have I Been Drained" Project

**Date:** December 2025  
**Context:** Solana wallet security checker with critical real-time data needs  
**Target CWV:** LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1

---

## 1. ASTRO OPTIMIZATION: Partial Hydration & Islands Architecture

### 1.1 What is Partial Hydration?

**Problem it Solves:**  
Traditional SPAs hydrate the *entire* page—reconstructing interactivity for every component, even static content. This means shipping massive JavaScript bundles and slow Time to Interactive (TTI).

**Astro's Solution:**  
Astro delivers **pure HTML by default** (zero JavaScript), then selectively hydrates only components that need interactivity. This is called **Islands Architecture**.

```
Page HTML (static, instant paint)
├── Static header
├── Static hero/content
└── Interactive "islands" (hydrated on-demand)
    ├── Wallet scanner form
    ├── Transaction analysis widget
    └── Alert notification system
```

### 1.2 Three Rendering Modes in Astro

| Mode | When | Output | Use Case |
|------|------|--------|----------|
| **Static (SSG)** | At build time | Pre-rendered HTML files | Blog posts, docs, landing pages |
| **Hybrid** | At build time + on-demand | Mix of pre-rendered + server-rendered | Most apps (build static, on-demand for dynamic) |
| **Server (SSR)** | On every request | Always server-rendered | Real-time data, auth-dependent content |

**For "Have I Been Drained":**
- **Landing page**: SSG (fast, no JS)
- **Wallet dashboard**: Hybrid (pre-render layout, server-render wallet data on-demand)
- **Transaction history**: SSR (real-time Solana data)

### 1.3 Client Directives: When to Hydrate

Each interactive component uses a **client directive** to specify hydration timing. This is the performance contract.

```astro
---
import WalletScanner from '../components/WalletScanner.svelte';
import RiskAlert from '../components/RiskAlert.jsx';
import TransactionTable from '../components/TransactionTable.svelte';
---

<!-- Hydrate immediately on page load (critical UX) -->
<WalletScanner client:load />

<!-- Hydrate when component enters viewport (lazy, below-fold) -->
<RiskAlert client:visible />

<!-- Hydrate when browser is idle (non-critical) -->
<TransactionTable client:idle />

<!-- Hydrate only on interaction (best for modals/tooltips) -->
<AdvancedSettings client:only="svelte" />

<!-- Hydrate based on media query (mobile vs desktop) -->
<MobileMenu client:media="(max-width: 768px)" />
```

**Directive Reference:**
- `client:load` – Hydrate immediately (use for: forms, critical buttons, hero CTAs)
- `client:idle` – Hydrate when browser has spare cycles (use for: non-critical widgets)
- `client:visible` – Hydrate when scrolled into view (use for: charts, infinite scroll, below-fold sections)
- `client:media` – Hydrate based on CSS media query (use for: responsive components)
- `client:only` – No SSR, only hydrate client-side (use for: 3rd-party embeds that break on server)

**Performance Impact:**
- Each island loads its own minimal JS bundle (tree-shaken)
- Static HTML loads instantly
- Islands are independent—a slow chart won't block a fast form
- No framework runtime in global scope

### 1.4 Server Islands vs Client Islands

**Server Islands** (new in Astro 4+):
```astro
---
import DatabaseQuery from '../components/DatabaseQuery.astro';
---

<!-- Rendered on server, ZERO JavaScript shipped -->
<!-- Perfect for data fetching, auth checks, CMS queries -->
<DatabaseQuery server:defer>
  <div slot="fallback">Loading...</div>
</DatabaseQuery>
```

**When to Use:**
- Fetching from APIs or databases
- Auth-dependent content
- Real-time data from Solana RPC
- Minimal interactivity needed

**Benefit:** Server islands add only serialized props (~100-300 bytes), not framework runtime.

### 1.5 Code Splitting: Minimize JavaScript

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [svelte(), react()],
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor code by framework
            'vendor-svelte': ['svelte'],
            'vendor-react': ['react', 'react-dom'],
            // Split by feature
            'solana-lib': ['@solana/web3.js', '@solana/spl-token'],
            'ui-components': ['your-ui-lib'],
          },
        },
      },
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Compress JS more aggressively
      minify: 'terser',
    },
  },
});
```

**Result:** Each island only loads what it needs. WalletScanner doesn't load React if it's Svelte.

---

## 2. SVELTE ISLANDS IN ASTRO

### 2.1 Why Svelte for Astro?

| Aspect | Svelte | React | Vue |
|--------|--------|-------|-----|
| **Bundle Size** | ~3-5 KB | ~30+ KB | ~10-12 KB |
| **SSR Friendly** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Compilation** | Compiles to vanilla JS | Ships runtime | Ships runtime |
| **Hydration** | Minimal | Heavy | Medium |
| **Best For** | Light, interactive widgets | Complex apps | Balanced |

**For wallet security checker:** Svelte is perfect for WalletScanner and RiskAnalyzer (small, reactive, minimal overhead).

### 2.2 Lazy Loading Svelte Islands

```astro
---
import { defineAsyncComponent } from 'astro:assets';

// Lazy-load the component
const WalletScanner = defineAsyncComponent(() =>
  import('../components/WalletScanner.svelte')
);
---

<!-- Only loads when visible -->
<WalletScanner client:visible />

<!-- Or with explicit loading control -->
{#if showScanner}
  <WalletScanner client:load />
{/if}
```

### 2.3 Independent Hydration

**Key Principle:** Each island hydrates independently. If WalletScanner fails to load, RiskAlert still works.

```astro
<!-- These three islands don't block each other -->
<WalletScanner client:visible />
<RiskAlert client:visible />
<TransactionChart client:idle />

<!-- If network drops mid-page, earlier islands are already interactive -->
```

**Performance Impact:**
- Single slow island won't freeze the page
- Faster Time to Interactive for critical islands
- Progressive enhancement: page works without JavaScript, then adds features

### 2.4 Performance Impact of Multiple Islands

**Rule of Thumb:** < 5 islands per page for optimal perf.

| Number of Islands | JS Overhead | TTI Impact | Recommendation |
|-------------------|------------|-----------|-----------------|
| 1-2 | Minimal | Negligible | ✅ Ideal |
| 3-5 | Small (~15-30 KB) | < 500ms | ✅ Good |
| 6-10 | Medium (~40-60 KB) | 500-1000ms | ⚠️ Monitor |
| 10+ | Heavy | > 1s | ❌ Refactor |

**For "Have I Been Drained":**
```astro
<!-- Recommended: 4 islands only -->
<WalletInput client:load />           <!-- Critical, immediate -->
<ScanResults client:visible />         <!-- Below fold, lazy -->
<RiskMetrics client:idle />            <!-- Non-critical, idle -->
<ReportModal client:only="svelte" />  <!-- Modal, on-demand -->
```

---

## 3. IMAGE OPTIMIZATION

### 3.1 Modern Image Formats

**Priority Order (by efficiency):**

1. **AVIF** – Best compression, newest
   - ~30% smaller than WebP
   - Limited browser support (~85% of users)
   - Risk: Safari/older browsers not supported

2. **WebP** – Good compression, wide support
   - ~25% smaller than JPEG
   - ~95% browser support
   - Fallback for AVIF

3. **JPEG/PNG** – Fallback only
   - Larger files
   - Universal support
   - Use only for edge cases

**Strategy:**
```html
<picture>
  <source type="image/avif" srcset="image.avif" />
  <source type="image/webp" srcset="image.webp" />
  <img src="image.jpg" alt="Description" loading="lazy" />
</picture>
```

**Cost-free image optimization:**
- **Cloudinary Free**: 25GB/month, automatic format selection
- **Uploadcare Free**: Generous free tier, adaptive delivery
- **Squoosh (CLI)**: Local batch conversion
- **ImageMagick**: Self-hosted batch tool

### 3.2 Responsive Images

```astro
---
import { Picture } from 'astro:assets';
import walletImage from '../images/wallet-security.png';
---

<Picture
  src={walletImage}
  widths={[320, 640, 960, 1280]}
  formats={['avif', 'webp', 'png']}
  alt="Wallet security illustration"
  class="hero-image"
/>
```

**Result:** Generates 12 variations (4 widths × 3 formats):
- Mobile (320px): ~40 KB
- Desktop (1280px): ~180 KB
- Browser chooses best match based on device

### 3.3 Astro Image Component

```astro
---
import { Image } from 'astro:assets';
import scanIcon from '../images/scan-icon.png';
---

<!-- Automatically optimized -->
<Image
  src={scanIcon}
  alt="Scan icon"
  width={64}
  height={64}
  format="webp"  <!-- Output format -->
/>

<!-- With custom loading behavior -->
<Image
  src={scanIcon}
  alt="Transaction icon"
  loading="lazy"
  decoding="async"
/>
```

**Built-in optimizations:**
- Automatic format conversion
- Responsive srcset generation
- Lazy loading by default
- Prevents layout shift (width/height required)

### 3.4 CDN Delivery Strategy

**Recommended:** Cloudflare R2 + Cloudflare Image Optimization

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [
    // Image optimization with Cloudflare
    cloudflareImageOptimization(),
  ],
});
```

**Why Cloudflare R2:**
- $0.015/GB (vs AWS S3 $0.023/GB)
- Zero egress fees (S3 charges $0.09/GB)
- Includes CDN globally
- Easy integration with Astro

**Optimization URLs:**
```
// Original
https://cdn.example.com/wallet-scan.png

// With transformations
https://cdn.example.com/wallet-scan.png?format=avif&width=640&quality=80

// Or use Cloudflare Image Resizing
https://cdn.example.com/wallet-scan.png/cdn-cgi/image/format=avif,width=640,quality=80
```

---

## 4. FONT OPTIMIZATION

### 4.1 Font Loading Strategies

**Problem:** Fonts block text rendering = FOIT (Flash of Invisible Text) or FOUT (Flash of Unstyled Text)

**Solution:** Use `font-display` property:

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;  /* Show fallback first, swap when loaded */
  font-weight: 400;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-bold.woff2') format('woff2');
  font-display: swap;
  font-weight: 700;
}

body {
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: 16px;
  line-height: 1.5;
}
```

**Font-display Values:**

| Value | Behavior | Use Case |
|-------|----------|----------|
| `auto` | Browser decides (usually FOIT) | Not recommended, unpredictable |
| `block` | Hide text 3s, then show (FOIT) | Brand-critical fonts, short wait |
| `swap` | Show fallback, swap when ready (FOUT) | **Best for web fonts** |
| `fallback` | Hide 100ms, then show fallback | Fast networks only |
| `optional` | Hide 100ms, use fallback if slow | Low-priority fonts |

**Recommendation: Always use `font-display: swap`**

### 4.2 Subsetting Fonts

**Problem:** Full font files include thousands of glyphs you don't use (Latin, Cyrillic, CJK, symbols).

**Solution:** Extract only characters you need.

```bash
# Using glyphhanger (Node tool)
npm install -g glyphhanger

# Extract characters from your site
glyphhanger https://wallet-security.com

# Subset font
glyphhanger --subset=Inter.woff2 --text="Your custom text here"
```

**Result:**
- Full Inter font: ~300 KB
- Subsetted (Latin only): ~40-50 KB
- 80%+ reduction!

**Astro Integration:**
```astro
---
// Embed subsetted font directly
const fontContent = await fetch('/fonts/inter-subset.woff2').then(r => r.arrayBuffer());
---

<style>
  @font-face {
    font-family: 'Inter';
    src: url('data:font/woff2;base64,...') format('woff2');
    font-display: swap;
  }
</style>
```

### 4.3 Web Font Loading Best Practices

**Optimal Setup:**

```html
<head>
  <!-- 1. Preload critical fonts (blocking render) -->
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

  <!-- 2. Inline font-face declarations -->
  <style>
    @font-face {
      font-family: 'Inter';
      src: url('/fonts/inter-regular.woff2') format('woff2');
      font-display: swap;
      font-weight: 400;
    }
    @font-face {
      font-family: 'Inter';
      src: url('/fonts/inter-bold.woff2') format('woff2');
      font-display: swap;
      font-weight: 700;
    }
  </style>

  <!-- 3. Fallback stylesheet for JavaScript-free experience -->
  <noscript>
    <link rel="stylesheet" href="/fonts/fallback.css" />
  </noscript>
</head>
```

**Trade-offs:**

| Approach | Pros | Cons |
|----------|------|------|
| System fonts only | Instant, 0 KB | Generic look |
| Google Fonts CDN | Easy, curated | Extra DNS lookup, ~50 KB |
| Self-hosted fonts | Full control, cache | Must subset & serve |
| Variable fonts | One file for all weights | Larger single file (~60 KB) |

**For "Have I Been Drained":** Use system fonts (Inter fallback) + preload 1-2 weights only.

### 4.4 FOUT Prevention

```css
/* Prevent cumulative layout shift during font swap */

/* Define metrics to match custom font dimensions */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;
  
  /* size-adjust aligns fallback metrics */
  size-adjust: 98%;
  ascent-override: 90%;
  descent-override: 20%;
  line-gap-override: 0%;
}

body {
  font-family: 'Inter', -apple-system, sans-serif;
}
```

**Result:** Fallback font and custom font render at ~same size = no jarring swap.

---

## 5. CRITICAL CSS EXTRACTION

### 5.1 What is Critical CSS?

Above-the-fold (ATF) styles = CSS needed to render the initial viewport before any scrolling.

**Without critical CSS:**
```
Browser loads HTML
  ↓
Browser blocks → waiting for external CSS
  ↓
CSS arrives, parsed
  ↓
Browser renders → NOW visible
```

**With critical CSS (inlined):**
```
Browser loads HTML (with inlined critical CSS)
  ↓
Browser renders immediately → visible at ~100ms
  ↓
Full CSS loads asynchronously in background
```

### 5.2 Extraction Strategy

**For "Have I Been Drained":**

**Above-the-fold elements:**
- Header + navigation
- Hero banner (if any)
- Wallet input form
- Primary button styles
- Core text styles

**Below-the-fold (can defer):**
- Transaction table styles
- Modal styles
- Charts/graphs
- Footer styles

### 5.3 Automated Extraction Tools

**Using Critters (Webpack):**
```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [
    // Critters automatically extracts critical CSS
    {
      name: 'critters',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          const Critters = (await import('critters')).default;
          const critters = new Critters({
            preload: 'swap',
            pruneSource: true,
          });
          // Process HTML files
        },
      },
    },
  ],
});
```

**Manual Extraction (for small sites):**
1. Open DevTools → Elements
2. Select above-fold elements
3. Copy Computed Styles
4. Create `critical.css`
5. Inline in `<head>`

```astro
---
import criticalCSS from '../styles/critical.css?raw';
---

<head>
  <style set:html={criticalCSS}></style>
  <!-- Defer non-critical CSS -->
  <link
    rel="stylesheet"
    href="/styles/main.css"
    media="print"
    onload="this.media='all'"
  />
  <noscript>
    <link rel="stylesheet" href="/styles/main.css" />
  </noscript>
</head>
```

### 5.4 Critical CSS Size Budget

**Target:** < 14 KB (compressed, inlined)

**For "Have I Been Drained":**
```
- Header styles: 2 KB
- Hero/banner: 3 KB
- Form styles: 4 KB
- Button styles: 2 KB
- Typography: 2 KB
- Layout grid: 1 KB
─────────────
Total: ~14 KB ✅
```

---

## 6. PREFETCHING & PRELOADING STRATEGIES

### 6.1 Resource Hints

| Hint | Purpose | Example |
|------|---------|---------|
| `preload` | Download critical resource ASAP | `<link rel="preload" href="font.woff2" as="font">` |
| `preconnect` | Establish TCP+DNS for domain | `<link rel="preconnect" href="https://api.example.com">` |
| `dns-prefetch` | Pre-resolve DNS only (backup) | `<link rel="dns-prefetch" href="//cdn.example.com">` |
| `prefetch` | Download resource for *next* page | `<link rel="prefetch" href="/next-page.js">` |

### 6.2 When to Use Each

**Preload (fetch critical resources early):**
```html
<head>
  <!-- Fonts needed immediately -->
  <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
  
  <!-- Large hero image above-fold -->
  <link rel="preload" href="/images/hero.webp" as="image" />
  
  <!-- Critical JavaScript (less common) -->
  <link rel="preload" href="/js/critical.js" as="script" />
</head>
```

**Preconnect (for API domains):**
```html
<head>
  <!-- Solana RPC endpoint -->
  <link rel="preconnect" href="https://api.mainnet-beta.solana.com" />
  
  <!-- CDN for assets -->
  <link rel="preconnect" href="https://cdn.example.com" crossorigin />
</head>
```

**DNS Prefetch (fallback, lightweight):**
```html
<head>
  <!-- Google Analytics -->
  <link rel="dns-prefetch" href="//www.google-analytics.com" />
  
  <!-- Third-party tracking (if used) -->
  <link rel="dns-prefetch" href="//cdn.segment.com" />
</head>
```

**Prefetch (for next navigation):**
```astro
---
// Prefetch likely next page
const nextPagePath = '/dashboard';
---

<link rel="prefetch" href={nextPagePath} />

<!-- Or for specific resources -->
<link rel="prefetch" href="/js/dashboard.js" />
<link rel="prefetch" href="/images/dashboard-hero.webp" />
```

### 6.3 Trade-offs & Common Pitfalls

**⚠️ Don't over-prefetch:**
- Every prefetch consumes bandwidth
- On slow mobile networks, prefetch steals from critical resources
- Average site: 2-4 prefetch hints max

**✅ Recommended for "Have I Been Drained":**
```astro
<!-- Only essential resource hints -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/images/logo.svg" as="image" />
<link rel="preconnect" href="https://api.mainnet-beta.solana.com" />
<link rel="dns-prefetch" href="//www.google-analytics.com" />
```

---

## 7. CORE WEB VITALS 2025

### 7.1 Current Metrics & Targets

**Three metrics Google measures:**

| Metric | What It Measures | Good | Needs Improvement | Poor |
|--------|-----------------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | Load speed | ≤ 2.5s | 2.5–4s | > 4s |
| **INP** (Interaction to Next Paint) | Responsiveness | ≤ 200ms | 200–500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | Visual stability | ≤ 0.1 | 0.1–0.25 | > 0.25 |

### 7.2 LCP (Largest Contentful Paint)

**Measures:** When largest visible element renders (image, video, text block, SVG).

**How to improve:**

1. **Optimize server response time**
   - Use edge caching (Cloudflare)
   - Pre-render static pages (Astro SSG)
   - Stream responses early

2. **Eliminate render-blocking resources**
   - Inline critical CSS
   - Defer non-critical JavaScript
   - Defer non-critical stylesheets

3. **Optimize images**
   - Use modern formats (AVIF/WebP)
   - Responsive image sizes
   - Lazy load below-fold images

4. **Use a CDN**
   - Serve images from edge locations
   - Reduce round-trip latency
   - Cache aggressively

**For "Have I Been Drained":**
```astro
---
// Pre-render landing page for instant LCP
import { Image } from 'astro:assets';
---

<!-- Preload hero image -->
<link rel="preload" href="/hero.webp" as="image" />

<!-- Use responsive image -->
<Image
  src={heroImage}
  alt="Wallet security check"
  width={1200}
  height={600}
  loading="eager"
/>

<!-- Form loads immediately (small, interactive) -->
<WalletScanner client:load />
```

**Target:** LCP < 1.5s for landing page, < 2.5s for dashboard.

### 7.3 INP (Interaction to Next Paint)

**Measures:** Delay between user input and next visible change (replaced FID in 2024).

**Common causes:**
- Heavy JavaScript execution
- Main thread blocking
- Slow event handlers

**How to improve:**

1. **Break up long JavaScript tasks** (60ms rule)
   ```javascript
   // ❌ Bad: 100ms blocking task
   function analyzeWallet(data) {
     const result = processLargeArray(data); // 100ms
     updateUI(result);
   }

   // ✅ Good: Break into 60ms chunks
   async function analyzeWallet(data) {
     const chunk1 = await processChunk1(data); // 50ms
     updateUI(chunk1);
     await new Promise(r => setTimeout(r, 0)); // Yield
     
     const chunk2 = await processChunk2(data); // 40ms
     updateUI(chunk2);
   }
   ```

2. **Use Web Workers for heavy processing**
   ```javascript
   // main.js
   const worker = new Worker('/workers/analysis.js');
   
   worker.postMessage({ walletData });
   worker.onmessage = (e) => {
     updateResults(e.data); // Fast UI update
   };

   // workers/analysis.js
   self.onmessage = (e) => {
     const analysis = runHeavyAnalysis(e.data);
     self.postMessage(analysis);
   };
   ```

3. **Minimize third-party scripts**
   - Load analytics asynchronously
   - Defer non-critical scripts
   - Use facade patterns for embeds

4. **Optimize event handlers**
   - Debounce/throttle input handlers
   - Use event delegation
   - Remove unused event listeners

**For "Have I Been Drained":**
```svelte
<!-- WalletScanner.svelte -->
<script>
  import { debounce } from 'lodash-es';

  let walletAddress = '';
  let isAnalyzing = false;

  // Debounce to prevent excessive processing
  const analyzeWallet = debounce(async (address) => {
    isAnalyzing = true;
    const results = await fetch(`/api/analyze?address=${address}`).then(r => r.json());
    isAnalyzing = false;
  }, 300);

  function handleInput(e) {
    walletAddress = e.target.value;
    analyzeWallet(walletAddress);
  }
</script>

<input
  type="text"
  placeholder="Enter wallet address"
  on:input={handleInput}
  disabled={isAnalyzing}
/>
```

**Target:** INP < 150ms for all interactions.

### 7.4 CLS (Cumulative Layout Shift)

**Measures:** Unexpected layout movements during page load.

**Common causes:**
- Images without dimensions
- Ads/embeds loading late
- Fonts swapping (FOUT)
- Injected content above existing content

**How to improve:**

1. **Always specify image dimensions**
   ```astro
   <!-- ❌ Bad: No width/height, causes shift -->
   <Image src={image} alt="..." />

   <!-- ✅ Good: Dimensions prevent shift -->
   <Image
     src={image}
     alt="..."
     width={800}
     height={600}
   />
   ```

2. **Reserve space for dynamic content**
   ```css
   /* Reserve space for modal/notification -->
   .modal-container {
     min-height: 400px; /* Prevents shift when modal appears */
   }

   /* Reserve space for ads */
   .ad-slot {
     min-height: 250px;
     min-width: 300px;
   }
   ```

3. **Prevent font FOUT**
   ```css
   /* Use font-display: swap with size-adjust */
   @font-face {
     font-family: 'Inter';
     src: url('/fonts/inter.woff2') format('woff2');
     font-display: swap;
     size-adjust: 98%; /* Match fallback metrics */
   }
   ```

4. **Use transform for animations, not layout changes**
   ```css
   /* ❌ Bad: Triggers layout recalc -->
   .slide-in {
     animation: slideIn 0.3s ease;
   }
   @keyframes slideIn {
     from { left: -100px; }
     to { left: 0; }
   }

   /* ✅ Good: Transform is cheap, no layout shift */
   .slide-in {
     animation: slideIn 0.3s ease;
   }
   @keyframes slideIn {
     from { transform: translateX(-100px); }
     to { transform: translateX(0); }
   }
   ```

**For "Have I Been Drained":**
```astro
---
import { Image } from 'astro:assets';
import riskIcon from '../images/risk-icon.svg';
---

<style>
  .result-card {
    /* Reserve space for content that loads dynamically */
    min-height: 200px;
  }

  .risk-badge {
    /* Fixed size prevents shift */
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>

<div class="result-card">
  <Image
    src={riskIcon}
    alt="Risk level"
    width={60}
    height={60}
    class="risk-badge"
  />
  {/* Content loads here */}
</div>
```

**Target:** CLS < 0.05 (excellent) or ≤ 0.1 (good).

### 7.5 Measuring Core Web Vitals

**Tools:**

1. **Chrome DevTools**
   - Lighthouse tab (built-in)
   - Performance tab (detailed metrics)
   - Web Vitals extension

2. **Web.dev Measure**
   - https://web.dev/measure
   - Free, gives instant report

3. **PageSpeed Insights**
   - https://pagespeed.web.dev
   - Field data (real users) + lab data

4. **CLI (Lighthouse)**
   ```bash
   npm install -g lighthouse
   lighthouse https://example.com --view
   ```

5. **CI Integration**
   ```bash
   # Run audit in CI pipeline
   lighthouse https://staging.example.com \
     --budget-path=./lighthouse-budget.json \
     --output-path=./reports/lighthouse.json
   ```

---

## 8. ASTRO CONFIGURATION FOR OPTIMAL PERFORMANCE

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';

export default defineConfig({
  // Site URL (required for sitemap, canonical links)
  site: 'https://haveibeedrained.com',

  // Output format
  output: 'hybrid', // SSG default, SSR on-demand for dynamic routes
  adapter: 'auto',

  // Image optimization (built-in, enabled by default)
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp', // Or use 'squoosh'
    },
    // Generate responsive srcsets
    domains: ['cdn.example.com'],
  },

  // Build optimization
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Split vendor and app code
          manualChunks: {
            'vendor-svelte': ['svelte'],
            'solana-web3': ['@solana/web3.js'],
          },
        },
      },
      // CSS code splitting
      cssCodeSplit: true,
      // Aggressive minification
      minify: 'terser',
      sourcemap: false, // Disable in production
    },
  },

  integrations: [
    // Framework integrations
    svelte({
      // Optimize Svelte compilation
    }),

    // Automatic compression (gzip + brotli)
    compress({
      img: true,
      svg: true,
      js: true,
      css: true,
    }),

    // Sitemap for SEO
    sitemap(),
  ],

  // Prefetch configuration
  prefetch: true, // Auto-prefetch links in viewport
});
```

---

## 9. IMAGE OPTIMIZATION STRATEGY

### 9.1 Complete Example

```astro
---
import { Picture, Image } from 'astro:assets';
import heroImage from '../images/hero.png';
import logoImage from '../images/logo.svg';

const socialImage = 'https://cdn.example.com/og-image.png';
---

<!-- Hero: Responsive with multiple formats -->
<Picture
  src={heroImage}
  alt="Wallet security scanner"
  widths={[320, 640, 960, 1280, 1600]}
  formats={['avif', 'webp', 'png']}
  class="hero-image"
/>

<!-- Logo: Small, inline SVG -->
<Image
  src={logoImage}
  alt="Have I Been Drained logo"
  width={200}
  height={60}
  class="logo"
/>

<!-- OG image for social sharing -->
<meta property="og:image" content={socialImage} />
<meta property="og:image:alt" content="Wallet security check illustration" />
```

### 9.2 CDN Configuration (Cloudflare R2)

```javascript
// astro.config.mjs
export default defineConfig({
  image: {
    // Use Cloudflare as CDN
    service: {
      entrypoint: 'astro/assets/services/cloudflare',
    },
  },
});
```

```env
# .env
PUBLIC_CDN_URL=https://cdn.haveibeedrained.com
```

---

## 10. FONT OPTIMIZATION STRATEGY

```astro
---
// fonts.astro - Import once, use everywhere
import '../styles/fonts.css';
---
```

```css
/* styles/fonts.css */

/* 1. Preload critical font weights -->
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-regular.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
  size-adjust: 98%;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-bold.woff2') format('woff2');
  font-display: swap;
  font-weight: 700;
  size-adjust: 98%;
}

/* 2. Use system font stack as fallback -->
:root {
  --font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Menlo', 'Monaco', 'Courier New', monospace;
}

body {
  font-family: var(--font-family);
}

code, pre {
  font-family: var(--font-mono);
}
```

```astro
<!-- Layout.astro -->
<head>
  <!-- Preload fonts -->
  <link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/fonts/inter-bold.woff2" as="font" type="font/woff2" crossorigin />
  
  <!-- Import font styles -->
  <Fonts />
</head>
```

---

## 11. LIGHTHOUSE AUDIT CHECKLIST

### 11.1 Performance (Target: 90+)

- [ ] **LCP < 2.5s** – Optimize hero image, critical CSS
- [ ] **INP < 200ms** – Break up JavaScript, use Web Workers
- [ ] **CLS < 0.1** – Define dimensions, reserve space
- [ ] **No render-blocking resources** – Defer CSS/JS
- [ ] **Images optimized** – AVIF/WebP, responsive sizes
- [ ] **Code splitting** – Separate vendor/app bundles
- [ ] **No unused CSS** – Use PurgeCSS, Tailwind
- [ ] **No unused JavaScript** – Tree-shake, code split
- [ ] **Caching headers set** – max-age for static assets
- [ ] **Compression enabled** – gzip/brotli for text

### 11.2 Accessibility (Target: 90+)

- [ ] **Color contrast ≥ 4.5:1** – Test with WebAIM
- [ ] **All inputs have labels** – `<label for="id">`
- [ ] **Focus visible on all elements** – outline: 2px solid
- [ ] **Semantic HTML** – `<button>`, `<nav>`, `<main>`
- [ ] **Alt text on images** – Describe content
- [ ] **ARIA attributes** – For dynamic content
- [ ] **No auto-play video/audio** – User initiates
- [ ] **Form validation clear** – Error messages visible

### 11.3 Best Practices (Target: 90+)

- [ ] **HTTPS enabled** – All traffic encrypted
- [ ] **No console errors** – Clean DevTools
- [ ] **No browser warnings** – Deprecated APIs
- [ ] **Viewport meta tag** – Mobile-responsive
- [ ] **Structured data** – Schema.org markup

### 11.4 SEO (Target: 90+)

- [ ] **`<title>` unique, descriptive** – 50-60 chars
- [ ] **Meta description** – 120-160 chars
- [ ] **Mobile-friendly** – Responsive design
- [ ] **Sitemap.xml** – Submitted to Search Console
- [ ] **Robots.txt** – Configured correctly
- [ ] **Canonical links** – Prevent duplicates
- [ ] **Structured data** – JSON-LD format
- [ ] **Open Graph tags** – Social sharing preview

---

## 12. PERFORMANCE BUDGET RECOMMENDATIONS

### 12.1 For "Have I Been Drained"

```json
{
  "version": 1.0,
  "budgets": [
    {
      "resourceType": "script",
      "budget": 150,
      "label": "JavaScript (KB)",
      "alert": 180
    },
    {
      "resourceType": "style",
      "budget": 50,
      "label": "CSS (KB)",
      "alert": 70
    },
    {
      "resourceType": "image",
      "budget": 200,
      "label": "Images (KB)",
      "alert": 250
    },
    {
      "resourceType": "font",
      "budget": 50,
      "label": "Fonts (KB)",
      "alert": 70
    },
    {
      "resourceType": "total",
      "budget": 500,
      "label": "Total (KB)",
      "alert": 600
    },
    {
      "type": "largest-contentful-paint",
      "budget": 2500,
      "label": "LCP (ms)",
      "alert": 3000
    },
    {
      "type": "interaction-to-next-paint",
      "budget": 200,
      "label": "INP (ms)",
      "alert": 300
    },
    {
      "type": "cumulative-layout-shift",
      "budget": 0.1,
      "label": "CLS",
      "alert": 0.15
    }
  ]
}
```

### 12.2 Enforcement

```bash
#!/bin/bash
# scripts/audit.sh

# Run Lighthouse audit
lighthouse \
  https://haveibeedrained.com \
  --budget-path=./lighthouse-budget.json \
  --chrome-flags="--headless" \
  --output-path=./dist/lighthouse.json

# Exit with error if budget exceeded
if grep -q '"overflow": true' ./dist/lighthouse.json; then
  echo "❌ Performance budget exceeded!"
  exit 1
fi

echo "✅ Performance budget met!"
```

---

## 13. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
- [ ] Configure Astro with hybrid SSG/SSR
- [ ] Set up Svelte islands for interactive components
- [ ] Implement Cloudflare R2 for CDN
- [ ] Extract and inline critical CSS

### Phase 2: Optimization (Week 2-3)
- [ ] Optimize hero image (AVIF/WebP, responsive)
- [ ] Subset and preload fonts
- [ ] Implement code splitting
- [ ] Set up resource hints (preconnect, prefetch)

### Phase 3: Measurement (Week 3-4)
- [ ] Set up Lighthouse CI in GitHub Actions
- [ ] Run Core Web Vitals audit
- [ ] Establish performance budget
- [ ] Set up monitoring (Vercel Analytics, etc.)

### Phase 4: Polish (Week 4)
- [ ] Implement Web Worker for heavy JS
- [ ] Add service worker for offline support
- [ ] Final Lighthouse audit
- [ ] Deploy to production

---

## 14. QUICK REFERENCE: COMMON PITFALLS

| Pitfall | Solution |
|---------|----------|
| Too many islands | Limit to < 5 per page |
| Large JS bundles | Use code splitting, tree-shaking |
| Unoptimized images | Always use AVIF/WebP with fallback |
| Blocking CSS | Inline critical CSS, defer rest |
| No font preloading | Preload critical weights |
| Layout shift | Define dimensions, reserve space |
| Main thread blocking | Break into 60ms tasks, use Web Workers |
| No resource hints | Add preconnect/preload for critical assets |
| Forgotten CLS fixes | Always set image width/height, use transform |
| Missing performance budget | Establish and enforce in CI |

---

## REFERENCES

- [Astro Official Docs: Islands Architecture](https://docs.astro.build/en/concepts/islands/)
- [Web.dev: Core Web Vitals Guide](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [Astro Image Optimization](https://docs.astro.build/en/guides/images/)
- [Font Optimization Best Practices](https://web.dev/articles/optimize-webfont-loading)
- [Lighthouse Performance Budgets](https://web.dev/articles/use-lighthouse-for-performance-budgets)
- [Critical CSS Extraction](https://web.dev/articles/extract-critical-css)

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Next Review:** As Astro/Svelte evolve (Q1 2026)