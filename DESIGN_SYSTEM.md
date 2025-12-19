# Have I Been Drained? Design System

**Neo-Brutalist Web3 Design System**

> A comprehensive design system combining neo-brutalist aesthetics with Web3-first principles for transparent, trustworthy wallet security interfaces.

---

## 🎨 Design Philosophy

### Core Principles

1. **Transparency Over Polish** - Raw, honest design that mirrors blockchain's immutable nature
2. **Safety Through Clarity** - Bold visual hierarchy guides users through critical security decisions
3. **Community-Centric** - Design that empowers users, not controls them
4. **Progressive Disclosure** - Hide complexity, reveal when needed
5. **Trust Through Visibility** - Every transaction detail visible before confirmation

### Neo-Brutalist Web3 Fusion

Our design system merges neo-brutalism's bold, unapologetic aesthetics with Web3's transparency requirements:

- **Bold Contrast** → Critical security warnings stand out
- **Raw Geometry** → Simple shapes convey complex blockchain concepts
- **Hard Shadows** → Tactile depth without deception
- **Oversized Typography** → Clear hierarchy for transaction flows
- **High-Contrast Colors** → Accessibility meets visual impact

---

## 🎨 Color System

### Primary Palette

Based on our logo's neon gradient (blue → pink), we use a high-contrast palette:

```css
/* Primary Gradient (from logo) */
--gradient-primary: linear-gradient(180deg, hsl(206, 75%, 49%) 0%, hsl(331, 90%, 56%) 100%);
--gradient-primary-horizontal: linear-gradient(90deg, hsl(206, 75%, 49%) 0%, hsl(331, 90%, 56%) 100%);

/* Core Colors */
--color-primary-blue: hsl(206, 75%, 49%);      /* #2B7BCE - Trust, security */
--color-primary-pink: hsl(331, 90%, 56%);      /* #F041FF - Energy, action */
--color-primary-purple: hsl(270, 70%, 50%);    /* #8B5CF6 - Balance point */

/* Neutrals (High Contrast) */
--color-black: #000000;                        /* Pure black - no fear */
--color-white: #FFFFFF;                        /* Pure white - clarity */
--color-gray-900: #17191E;                    /* Dark surface */
--color-gray-800: #1E293B;                    /* Surface elevation */
--color-gray-700: #334155;                    /* Borders, dividers */
--color-gray-400: #94A3B8;                    /* Muted text */
--color-gray-200: #E2E8F0;                    /* Light borders */

/* Semantic Colors */
--color-success: #22C55E;                     /* Green - safe, verified */
--color-warning: #F59E0B;                     /* Amber - caution */
--color-danger: #EF4444;                      /* Red - critical threat */
--color-info: #3B82F6;                        /* Blue - information */

/* Backgrounds */
--color-background: #0F172A;                  /* Deep space - main bg */
--color-surface: #1E293B;                     /* Elevated surfaces */
--color-surface-elevated: #334155;            /* Cards, modals */
```

### Color Usage Guidelines

**Primary Actions:**
- Use gradient for CTAs (Connect Wallet, Approve Transaction)
- Solid blue for secondary actions
- Solid pink for destructive/urgent actions

**Status Indicators:**
- **Safe**: `--color-success` (green) with black border
- **Warning**: `--color-warning` (amber) with black border  
- **Critical**: `--color-danger` (red) with black border
- **Info**: `--color-info` (blue) with black border

**Text Hierarchy:**
- **Primary**: `--color-white` on dark backgrounds
- **Secondary**: `--color-gray-400` for muted text
- **Accent**: Gradient text for headings

**Accessibility:**
- All color combinations meet WCAG AA contrast ratios (4.5:1 minimum)
- Never use color alone to convey meaning (always include icons/text)

---

## ✍️ Typography

### Font Stack

**Primary (System Fonts - Neo-Brutalist Approach):**
```css
--font-primary: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                 Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
--font-mono: 'Courier New', Courier, 'Lucida Console', monospace;
```

**Why System Fonts?**
- Performance (no font loading)
- Raw, unpolished aesthetic
- Universal availability
- Aligns with neo-brutalist minimalism

### Type Scale

Neo-brutalism uses **oversized typography** as a primary design element:

```css
/* Display (Hero, Landing) */
--text-display-2xl: 4.5rem;      /* 72px - Hero headlines */
--text-display-xl: 3.75rem;     /* 60px - Section headers */
--text-display-lg: 3rem;         /* 48px - Large headers */

/* Headings */
--text-heading-xl: 2.25rem;     /* 36px - Page titles */
--text-heading-lg: 1.875rem; 