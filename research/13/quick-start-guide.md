# Frontend Performance Optimization: Quick Start Guide
## For "Have I Been Drained" (Solana Wallet Security Checker)

---

## DECISION TREE: Which Optimization First?

```
Starting Point: Landing Page Load Time Slow?
│
├─ YES, > 5 seconds
│  └─ CHECK: Image sizes (usually 70% of problem)
│     ├─ YES, large JPEG/PNG
│     │  └─ ACTION: Convert to AVIF/WebP, set responsive widths
│     │
│     └─ NO, images already small
│        └─ CHECK: JavaScript loaded?
│           ├─ YES, render-blocking <script>
│           │  └─ ACTION: Defer or async, or move to <body>
│           │
│           └─ NO
│              └─ CHECK: CSS file size?
│                 ├─ YES, > 100 KB
│                 │  └─ ACTION: Extract critical CSS, defer rest
│                 │
│                 └─ NO
│                    └─ ACTION: Check server response time
│
├─ MEDIUM, 3-5 seconds
│  └─ ACTION: Optimize all of above + code split
│
└─ FAST, < 3 seconds
   └─ ACTION: Focus on INP/CLS for interactivity
```

---

## PHASE-BY-PHASE IMPLEMENTATION

### Phase 1: Foundation (Week 1)
**Goal:** Set up infrastructure for performance

**Tasks:**
1. [ ] Initialize Astro with hybrid SSG/SSR
   ```bash
   npm create astro@latest -- --template minimal
   npm install @astrojs/svelte @astrojs/sitemap astro-compress
   ```

2. [ ] Create optimized astro.config.mjs (see separate file)
   - Set output: 'hybrid'
   - Configure Vite for code splitting
   - Enable compression integration

3. [ ] Set up Cloudflare R2 for CDN
   - Create R2 bucket
   - Enable Cloudflare Image Optimization
   - Configure domain routing

4. [ ] Create base layout with critical CSS
   - Extract above-the-fold styles
   - Inline in `<head>`
   - Defer non-critical CSS with print+onload trick

**Measurement:**
- Run `npm run build` and check output sizes
- Use Lighthouse CI locally: `lighthouse https://localhost:3000`
- Target: Bundle size < 200 KB (JS + CSS)

---

### Phase 2: Image & Font Optimization (Week 2)
**Goal:** Reduce payload, improve LCP

**Tasks:**
1. [ ] Set up image processing pipeline
   ```bash
   # Install image processing tools
   npm install -D sharp @squoosh/cli

   # Create optimization script
   npm run optimize:images
   ```

2. [ ] Create responsive image components
   - Use `<Picture>` for AVIF/WebP fallback
   - Set widths: [320, 640, 960, 1280]
   - Add loading="lazy" for below-fold

3. [ ] Optimize fonts
   ```bash
   # Install font subsetting tool
   npm install -g glyphhanger

   # Subset fonts (keep only used characters)
   glyphhanger your-site.com --subset=Inter.woff2
   ```

4. [ ] Add font preload and swap
   ```html
   <link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin />
   @font-face {
     font-display: swap; /* Show fallback while loading */
   }
   ```

**Measurements:**
- Compare image sizes: JPEG → AVIF (should be ~30% smaller)
- Check font-display swap prevents layout shift
- Target: Hero image < 100 KB, fonts < 50 KB

---

### Phase 3: JavaScript Optimization (Week 3)
**Goal:** Improve INP and TTI

**Tasks:**
1. [ ] Convert static components to Astro (zero JS)
   - Header, footer, nav → Astro components
   - Content, marketing copy → Astro components

2. [ ] Create interactive islands for Svelte
   ```astro
   <!-- Only these get JavaScript -->
   <WalletScanner client:load />        <!-- Critical, immediate -->
   <ScanResults client:visible />       <!-- Below fold, lazy -->
   <ReportModal client:only="svelte" /> <!-- On demand -->
   ```

3. [ ] Implement code splitting
   ```javascript
   // astro.config.mjs
   rollupOptions: {
     output: {
       manualChunks: {
         'vendor-svelte': ['svelte'],
         'solana': ['@solana/web3.js'],
         'scanner': ['./components/WalletScanner.svelte']
       }
     }
   }
   ```

4. [ ] Move heavy processing to Web Worker
   ```javascript
   // In Svelte component
   const worker = new Worker('/workers/analyzer.js');
   worker.postMessage({ walletData });
   worker.onmessage = (e) => updateUI(e.data);
   ```

**Measurements:**
- Check bundle breakdown: `npm run build -- --stats`
- Verify Svelte island is < 15 KB
- Target: JavaScript < 150 KB total

---

### Phase 4: Real-time & Measurement (Week 4)
**Goal:** Monitor and prevent regressions

**Tasks:**
1. [ ] Set up Lighthouse CI in GitHub Actions
   ```yaml
   # .github/workflows/lighthouse-ci.yml
   - uses: treosh/lighthouse-ci-action@v10
     with:
       budgetPath: ./lighthouse-budget.json
   ```

2. [ ] Create performance budget
   ```json
   // lighthouse-budget.json
   {
     "budgets": [
       { "resourceType": "script", "budget": 150 },
       { "resourceType": "image", "budget": 200 },
       { "type": "largest-contentful-paint", "budget": 2500 },
       { "type": "cumulative-layout-shift", "budget": 0.1 }
     ]
   }
   ```

3. [ ] Add resource hints (preconnect, prefetch)
   ```html
   <!-- For Solana RPC -->
   <link rel="preconnect" href="https://api.mainnet-beta.solana.com" />
   <!-- For Google Analytics (if used) -->
   <link rel="dns-prefetch" href="//www.google-analytics.com" />
   ```

4. [ ] Monitor Core Web Vitals
   - Install web-vitals library
   - Send metrics to Vercel Analytics or similar
   - Check production performance weekly

**Measurements:**
- Lighthouse score: Target 90+
- LCP: < 2.5 seconds
- INP: < 200 milliseconds
- CLS: < 0.1

---

## QUICK WINS (Implement First)

### 1. Image Optimization (30-40% improvement)
```bash
# Convert all JPEGs to WebP
for file in *.jpg; do
  cwebp "$file" -o "${file%.jpg}.webp"
done

# Convert to AVIF (better compression)
for file in *.jpg; do
  convert "$file" -quality 80 "${file%.jpg}.avif"
done
```

**Impact:** Hero image 500 KB → 50 KB = 10x faster LCP

### 2. Critical CSS Extraction (20-25% improvement)
```html
<!-- Before: Render-blocking CSS -->
<link rel="stylesheet" href="styles.css" />

<!-- After: Inline critical, defer rest -->
<style>/* Above-fold styles only, ~5KB */</style>
<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'" />
```

**Impact:** LCP 4s → 2.5s = 40% faster

### 3. Font Optimization (15-20% improvement)
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-subset.woff2'); /* Subset only */
  font-display: swap; /* Show fallback immediately */
}
```

**Impact:** Eliminates FOIT (Flash of Invisible Text), improves perceived perf

### 4. Code Splitting (25-30% improvement)
```javascript
// Don't ship all JavaScript on first load
// Each island loads only what it needs
```

**Impact:** TTI 3s → 1.5s = 50% faster interactivity

---

## COMMON MISTAKES TO AVOID

| Mistake | Impact | Fix |
|---------|--------|-----|
| Serving JPEG/PNG to modern browsers | +200% image size | Use AVIF/WebP |
| Not subsetting fonts | +100-200 KB | Use glyphhanger |
| Lazy-loading critical images | Slower LCP | Use `loading="eager"` for hero |
| Too many islands (10+) | Slow TTI | Limit to 3-5 per page |
| Heavy JavaScript on landing page | TTI > 3s | Move to client:visible/idle |
| Not defining image dimensions | Layout shift | Always set width/height |
| Sending all styles to all pages | Slow FCP | Inline critical CSS only |
| Third-party scripts blocking render | LCP > 4s | Load async or deferred |

---

## TESTING CHECKLIST

### Before Deployment
- [ ] Run `npm run build` successfully
- [ ] Check bundle sizes: `npm run build -- --stats`
  - JavaScript: < 150 KB
  - CSS: < 50 KB
  - Images: < 200 KB
- [ ] Run Lighthouse audit locally
  ```bash
  npm run build
  npx lighthouse http://localhost:3000 --view
  ```
- [ ] Test on slow 4G throttling in DevTools
- [ ] Verify Lighthouse score: 90+
- [ ] Check Core Web Vitals:
  - LCP ≤ 2.5s
  - INP ≤ 200ms
  - CLS ≤ 0.1

### After Deployment
- [ ] Monitor real user metrics (RUM)
  - Use Vercel Analytics or Google Analytics
  - Check Core Web Vitals weekly
- [ ] Set up performance budget in CI
  - Fail build if exceeds budget
  - Review regressions in PRs
- [ ] Monitor third-party impact
  - Track analytics, fonts, CDN latency
- [ ] Monthly performance review
  - Compare with competitors
  - Plan optimizations for next quarter

---

## TOOLS CHECKLIST

### Essential
- [ ] **Lighthouse** – Performance audits
- [ ] **Chrome DevTools** – Real-time measurement
- [ ] **web.dev Measure** – Free audits
- [ ] **PageSpeed Insights** – Real user data

### Image Processing
- [ ] **Squoosh CLI** – Fast batch conversion
- [ ] **ImageMagick** – Advanced image operations
- [ ] **Sharp** – Node.js image processing

### Font Tools
- [ ] **glyphhanger** – Font subsetting
- [ ] **Fonttools** – Font analysis

### CI/CD
- [ ] **Lighthouse CI** – Automated audits
- [ ] **GitHub Actions** – CI pipeline
- [ ] **Vercel** – Auto-deployment + Analytics

### Monitoring
- [ ] **Vercel Analytics** – Real user metrics
- [ ] **web-vitals** – CWV library
- [ ] **Sentry** – Error monitoring
- [ ] **Datadog** – Advanced monitoring (paid)

---

## COST-FREE OPTIMIZATION RESOURCES

| Service | Free Tier | Use Case |
|---------|-----------|----------|
| **Cloudflare R2** | 25 GB/month free | Image CDN, storage |
| **Vercel** | Unlimited free tier | Hosting, analytics |
| **Squoosh** | Web app, free forever | Image conversion |
| **glyphhanger** | Free CLI tool | Font subsetting |
| **Lighthouse** | Built-in to Chrome | Performance audits |
| **GitHub Actions** | 2000 minutes/month | CI/CD |
| **Cloudinary** | 25 GB/month free | Image optimization |
| **Uploadcare** | Generous free tier | Adaptive image delivery |

---

## EXPECTED PERFORMANCE IMPROVEMENTS

### Before Optimization
- LCP: 4-5 seconds
- TTI: 3-4 seconds
- Bundle size: 500+ KB
- Lighthouse: 50-60

### After Phase 1 (Foundation)
- LCP: 3.5 seconds (-25%)
- TTI: 2.5 seconds (-25%)
- Bundle size: 350 KB (-30%)
- Lighthouse: 65-70

### After Phase 2 (Images & Fonts)
- LCP: 2.0 seconds (-40%)
- TTI: 2.0 seconds
- Bundle size: 250 KB (-30%)
- Lighthouse: 75-80

### After Phase 3 (JavaScript)
- LCP: 1.5 seconds (-25%)
- TTI: 1.0 second (-50%)
- Bundle size: 180 KB (-30%)
- Lighthouse: 85-90

### After Phase 4 (Monitoring)
- LCP: 1.2 seconds (-20%)
- INP: 120 ms (< 200ms target)
- CLS: 0.05 (< 0.1 target)
- Lighthouse: 95+

---

## PROJECT TIMELINE

```
Week 1: Foundation
├─ Day 1-2: Astro setup, astro.config.mjs
├─ Day 3-4: Cloudflare R2, base layout with critical CSS
└─ Day 5: Testing, measure baseline

Week 2: Images & Fonts
├─ Day 1-2: Image optimization pipeline
├─ Day 3-4: Font subsetting, preload
└─ Day 5: Testing, measure LCP improvement

Week 3: JavaScript
├─ Day 1-2: Create Svelte islands
├─ Day 3-4: Code splitting, Web Worker
└─ Day 5: Testing, measure INP improvement

Week 4: Monitoring
├─ Day 1-2: Lighthouse CI setup
├─ Day 3-4: Performance budget, resource hints
└─ Day 5: Final audit, deploy, monitor
```

---

## ADDITIONAL RESOURCES

### Documentation
- [Astro Official Docs](https://docs.astro.build)
- [Web.dev Performance Guide](https://web.dev/performance)
- [MDN: Web Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)

### Courses (Free)
- [Google: Web Fundamentals](https://developers.google.com/web/fundamentals)
- [Udacity: Website Performance Optimization](https://www.udacity.com/course/website-performance-optimization--ud884)

### Tools
- [Lighthouse](https://github.com/GoogleChrome/lighthouse)
- [WebPageTest](https://www.webpagetest.org)
- [SpeedCurve](https://speedcurve.com)

---

**Next Steps:** Start with Phase 1 this week, focus on quick wins (images + critical CSS), and integrate monitoring from day one.

---

**Document Generated:** December 2025  
**Version:** 1.0  
**Revision Date:** Check back Q1 2026 for Astro 5+ updates