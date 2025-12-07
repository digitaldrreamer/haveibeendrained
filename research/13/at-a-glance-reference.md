# Core Web Vitals & Performance Optimization At-a-Glance
## Quick Reference for "Have I Been Drained"

---

## CORE WEB VITALS 2025: THE THREE METRICS

### 1. LCP (Largest Contentful Paint)
**What:** When largest visible element renders (image, headline, text block)

```
Timeline:
0ms ─────────────────────────────────────── 2500ms (target)
     ├─ Good (≤2.5s) ✅
     ├─ Needs Improvement (2.5-4s) ⚠️
     └─ Poor (>4s) ❌
```

**How to Improve:**
| Action | Impact | Effort |
|--------|--------|--------|
| Optimize hero image (AVIF/WebP) | 40% faster | Easy |
| Inline critical CSS | 30% faster | Medium |
| Defer JavaScript | 20% faster | Medium |
| Use CDN | 25% faster | Easy |

**Best Tools:** DevTools → Performance tab, Chrome UX Report

---

### 2. INP (Interaction to Next Paint)
**What:** Delay between user clicking/typing and visual response

```
Timeline:
0ms ────────────────────────────── 200ms (target)
     ├─ Good (≤200ms) ✅
     ├─ Needs Improvement (200-500ms) ⚠️
     └─ Poor (>500ms) ❌
```

**How to Improve:**
| Action | Impact | Effort |
|--------|--------|--------|
| Break JavaScript into <60ms tasks | 50% faster | Hard |
| Use Web Workers for heavy processing | 60% faster | Medium |
| Minimize main thread work | 30% faster | Medium |
| Use Svelte (small framework) | 40% faster | Easy |

**Best Tools:** DevTools → Performance tab, Interaction Lab

---

### 3. CLS (Cumulative Layout Shift)
**What:** Visual movement during page load (images/text jumping around)

```
Score:
0.0 ─────────────────────────── 0.1 (target)
     ├─ Good (≤0.1) ✅
     ├─ Needs Improvement (0.1-0.25) ⚠️
     └─ Poor (>0.25) ❌
```

**How to Improve:**
| Action | Impact | Effort |
|--------|--------|--------|
| Define image width/height | Eliminates shifts | Very Easy |
| Use transform instead of layout | Eliminates shifts | Easy |
| Reserve space for lazy content | Eliminates shifts | Easy |
| Prevent font swapping | Eliminates shifts | Medium |

**Best Tools:** DevTools → Performance tab, Layout Instability

---

## OPTIMIZATION QUICK WINS (Ranked by Impact)

### 🥇 #1: Image Optimization (40% improvement)
```
BEFORE: hero.jpg (500 KB) → rendered at 1280px
AFTER:  hero.avif (50 KB) → rendered at 1280px
RESULT: 10x smaller, LCP 4s → 2.5s
```

**Action:** Convert to AVIF/WebP, use responsive widths
**Effort:** 2-3 hours
**Tools:** Squoosh, ImageMagick, Sharp

---

### 🥈 #2: Critical CSS Extraction (30% improvement)
```
BEFORE: Entire styles.css (100 KB) blocks render
AFTER:  Critical (5 KB) inlined, rest deferred
RESULT: FCP 3s → 2s
```

**Action:** Identify above-fold styles, inline in <head>
**Effort:** 1-2 hours
**Tools:** Penthouse, Critters, manual

---

### 🥉 #3: Code Splitting (25% improvement)
```
BEFORE: Single JavaScript bundle (400 KB) for entire app
AFTER:  Feature chunks: scanner (30 KB) + analysis (40 KB)
RESULT: TTI 3s → 1.5s (only load what's needed)
```

**Action:** Configure Rollup manual chunks in Vite
**Effort:** 2-3 hours
**Tools:** Astro built-in, Rollup

---

### 🎯 #4: Font Optimization (15% improvement)
```
BEFORE: Full Inter font (300 KB)
AFTER:  Subsetted to Latin only (40 KB)
RESULT: Font load 1.5s → 200ms
```

**Action:** Subset fonts, use font-display: swap
**Effort:** 1-2 hours
**Tools:** glyphhanger, subsetter

---

### ⚡ #5: Resource Hints (10% improvement)
```
BEFORE: Resolve DNS when resource needed
AFTER:  Pre-resolve DNS + establish connection
RESULT: 100ms saved on first request
```

**Action:** Add <link rel="preconnect">, <link rel="preload">
**Effort:** 30 minutes
**Tools:** Manual, check with DevTools

---

## ASTRO ISLANDS: WHAT TO HYDRATE WHEN

```
Page Structure:
├─ Static Header                    → Astro component (no JS)
├─ Hero Section                     → Astro component (no JS)
├─ Marketing Content                → Astro markdown (no JS)
│
├─ Wallet Input Form               → Svelte client:load (immediate)
│  └─ Needs interaction right away
│
├─ Risk Analysis Results           → Svelte client:visible (lazy)
│  └─ Only needed when user scrolls to it
│
├─ Transaction History Table       → Svelte client:idle (idle)
│  └─ Non-critical, can wait for browser idle
│
└─ Footer                          → Astro component (no JS)
```

**Result:** 70% of page = zero JavaScript, only 30% needs hydration

---

## PERFORMANCE BUDGET: YOUR LIMITS

```
Resource Limits (for "Have I Been Drained"):
├─ JavaScript:          150 KB max  (Svelte islands + libraries)
├─ CSS:                 50 KB max   (inlined critical + deferred)
├─ Images:              200 KB max  (hero + icons)
├─ Fonts:               50 KB max   (subsetted weights only)
└─ Total:               500 KB max  (competitive SPA is 1-2 MB)

Performance Limits:
├─ LCP:                 2.5s max    (when largest element visible)
├─ INP:                 200ms max   (response to interaction)
├─ CLS:                 0.1 max     (visual stability score)
└─ Lighthouse Score:    90+ target  (overall quality)
```

**Enforcement:** Fail build in CI if exceeded

---

## SVELTE vs REACT: WHY SVELTE WINS FOR ISLANDS

```
Bundle Size Comparison (per island):

Svelte Island:
├─ Framework: 3 KB
├─ Component: 2 KB
└─ Total: 5 KB ✅

React Island:
├─ Framework: 30 KB
├─ Component: 3 KB
└─ Total: 33 KB (6.6x heavier) ❌

Vue Island:
├─ Framework: 10 KB
├─ Component: 2 KB
└─ Total: 12 KB (2.4x heavier) ⚠️
```

**Decision:** Use Svelte for all interactive components

---

## IMAGE FORMAT DECISION TREE

```
Choosing Image Format:

Is this a modern browser?
├─ YES → Try AVIF (best compression)
│  └─ AVIF broken in Safari? 
│     ├─ YES → Use WebP as fallback
│     └─ NO → Use AVIF
│
└─ NO (old browser) → Use JPEG/PNG

Result in HTML:
<picture>
  <source type="image/avif" srcset="image.avif" />
  <source type="image/webp" srcset="image.webp" />
  <img src="image.jpg" alt="" />  ← Fallback
</picture>
```

**File Size Comparison:**
- JPEG: 500 KB (baseline)
- WebP: 375 KB (25% smaller) ✅
- AVIF: 350 KB (30% smaller) ✅✅

---

## FONT LOADING STRATEGY

```
1. Preload critical fonts (highest priority)
   <link rel="preload" href="inter-regular.woff2" as="font" crossorigin />

2. Declare with font-display: swap (show fallback, swap when ready)
   @font-face {
     font-family: 'Inter';
     src: url('inter-regular.woff2');
     font-display: swap;  ← KEY LINE
   }

3. Use system fonts as fallback
   body { font-family: 'Inter', system-ui, sans-serif; }

Timeline:
0ms ─────────────────────────────────
    ├─ 0-100ms: Show system font (Arial)
    ├─ 100-1500ms: Load custom font
    └─ 1500ms+: Swap to custom font
    
    Result: Text always visible, minor font swap
```

---

## LIGHTHOUSE AUDIT: 90+ SCORE CHECKLIST

### Performance (Weight: 30%)
- [ ] LCP ≤ 2.5s
- [ ] INP ≤ 200ms
- [ ] CLS ≤ 0.1
- [ ] FCP ≤ 1.8s
- [ ] TTFB ≤ 600ms

**Quick Wins:**
- Optimize images
- Defer JavaScript
- Extract critical CSS

### Accessibility (Weight: 20%)
- [ ] Color contrast ≥ 4.5:1
- [ ] Semantic HTML
- [ ] ARIA labels
- [ ] Keyboard navigation

**Quick Wins:**
- Check contrast tool
- Use <button>, <nav>, <main>
- Add alt text to images

### Best Practices (Weight: 15%)
- [ ] HTTPS only
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Viewport meta tag

**Quick Wins:**
- Fix DevTools errors
- Test on mobile
- Check HTTPS

### SEO (Weight: 15%)
- [ ] Title unique
- [ ] Meta description
- [ ] Canonical links
- [ ] Structured data

**Quick Wins:**
- Add schema.org JSON-LD
- Write meta descriptions
- Create sitemap.xml

### PWA (Weight: 20%)
- [ ] Installable
- [ ] Service Worker
- [ ] Manifest file

**Quick Wins:**
- Add manifest.webmanifest
- Install SW basics

---

## WEEKLY PERFORMANCE CHECK

### Every Monday
- [ ] Run Lighthouse audit on production
- [ ] Check Core Web Vitals on Chrome UX Report
- [ ] Review RUM (Real User Metrics)
- [ ] Compare with competitors

### Monthly
- [ ] Analyze performance trends
- [ ] Update performance budget if needed
- [ ] Plan optimizations for next month
- [ ] Document changes for retrospective

### Per Release
- [ ] Run Lighthouse CI before merging
- [ ] Verify bundle size change
- [ ] Test on slow 4G in DevTools
- [ ] Check performance on low-end devices

---

## DEPLOYMENT CHECKLIST

### Before Going Live
- [ ] Lighthouse score: 90+
- [ ] LCP: ≤ 2.5s
- [ ] INP: ≤ 200ms
- [ ] CLS: ≤ 0.1
- [ ] Bundle size: < 200 KB (JS)
- [ ] No console errors
- [ ] Tested on slow 4G
- [ ] Tested on low-end device (Moto G4)

### After Deployment
- [ ] Monitor RUM metrics for 24 hours
- [ ] Check Core Web Vitals dashboard
- [ ] Set up performance alerts
- [ ] Document baseline for comparison

---

## COST-FREE TOOLS CHECKLIST

### Essential (Start Day 1)
- [ ] Chrome DevTools (built-in)
- [ ] Lighthouse (free, in DevTools)
- [ ] Web.dev Measure (free web app)
- [ ] PageSpeed Insights (free)
- [ ] Squoosh (image optimization)

### Recommended (Setup Week 1)
- [ ] Cloudflare R2 (25 GB free tier)
- [ ] GitHub Actions (2000 min free)
- [ ] Lighthouse CI (free plugin)
- [ ] Vercel Analytics (free tier)

### Nice-to-Have (Setup Week 2+)
- [ ] glyphhanger (font subsetting)
- [ ] WebPageTest (free throttled testing)
- [ ] GTmetrix (free performance report)

---

## COMMON PERFORMANCE PROBLEMS & SOLUTIONS

| Problem | Symptom | Solution | Time |
|---------|---------|----------|------|
| Large images | LCP > 3s | AVIF/WebP + responsive | 2h |
| Blocking CSS | FCP > 2s | Inline critical CSS | 1h |
| Unsubset fonts | CLS movement | glyphhanger subset | 1h |
| Too much JS | TTI > 2s | Code split, Web Worker | 3h |
| Missing images dimensions | CLS > 0.2 | Add width/height | 30m |
| Third-party scripts | LCP > 3s | Defer or load async | 1h |
| No CDN | LCP > 3s | Add Cloudflare R2 | 1h |
| No budget enforcement | Slow drift | Add Lighthouse CI | 1h |

---

## NEXT STEP: RUN YOUR FIRST AUDIT

```bash
# Install Lighthouse globally
npm install -g lighthouse

# Run audit on your site (after npm run build)
lighthouse https://localhost:3000 \
  --view \
  --output=json

# Check results
# Aim for:
# - Performance: 90+
# - Accessibility: 90+
# - Best Practices: 90+
# - SEO: 90+
```

---

## REMEMBER

> **Performance is not optional.** It's a feature that affects:
> - User experience (bounce rate ↑ with slow pages)
> - Search ranking (Google ranks fast sites higher)
> - Revenue (47% abandon sites that take >2s)
> - Accessibility (slow connections, low-end devices)

**Every 100ms of load time costs 1% in conversions.**

For "Have I Been Drained," fast performance = more users checking their wallets = more security awareness.

---

**Quick Reference Version:** December 2025  
**Bookmark This File** for daily reference during development