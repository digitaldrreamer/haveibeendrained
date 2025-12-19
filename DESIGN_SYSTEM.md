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
--text-heading-lg: 1.875rem;    /* 30px - Section titles */
--text-heading-md: 1.5rem;      /* 24px - Subsection titles */
--text-heading-sm: 1.25rem;     /* 20px - Card titles */

/* Body */
--text-body-lg: 1.125rem;       /* 18px - Large body text */
--text-body-md: 1rem;           /* 16px - Default body */
--text-body-sm: 0.875rem;       /* 14px - Small text */
--text-body-xs: 0.75rem;        /* 12px - Captions, labels */

/* Monospace (Addresses, Hashes) */
--text-mono-lg: 1.125rem;       /* 18px - Large addresses */
--text-mono-md: 1rem;           /* 16px - Default addresses */
--text-mono-sm: 0.875rem;       /* 14px - Small hashes */
```

### Typography Usage

**Display Text:**
- Use for hero headlines, landing page titles
- Always bold (`font-weight: 700`)
- Can use gradient text effect for impact
- Maximum 2-3 words per line

**Headings:**
- Clear hierarchy: XL → LG → MD → SM
- Bold weight (`font-weight: 700`) for emphasis
- Use gradient text for primary headings
- Maintain consistent spacing below

**Body Text:**
- Default: `--text-body-md` (16px)
- Line height: 1.6 for readability
- Use `--text-body-sm` for secondary information
- Monospace for all blockchain addresses/hashes

**Font Weights:**
```css
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-black: 900;  /* For extreme emphasis */
```

---

## 📐 Spacing System

Neo-brutalism uses **generous, consistent spacing** for clarity:

```css
/* Base unit: 4px (0.25rem) */
--space-0: 0;
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;      /* 8px */
--space-3: 0.75rem;     /* 12px */
--space-4: 1rem;        /* 16px - Base unit */
--space-5: 1.25rem;     /* 20px */
--space-6: 1.5rem;      /* 24px */
--space-8: 2rem;        /* 32px */
--space-10: 2.5rem;     /* 40px */
--space-12: 3rem;       /* 48px */
--space-16: 4rem;       /* 64px */
--space-20: 5rem;       /* 80px */
--space-24: 6rem;       /* 96px */
--space-32: 8rem;       /* 128px */
```

### Spacing Guidelines

- **Component Padding**: `--space-4` to `--space-6` (16-24px)
- **Section Spacing**: `--space-12` to `--space-16` (48-64px)
- **Card Gaps**: `--space-4` to `--space-6` (16-24px)
- **Form Fields**: `--space-3` to `--space-4` (12-16px) between fields

---

## 🎭 Shadows & Depth

Neo-brutalism uses **hard, offset shadows** (not soft blurs):

```css
/* Hard Shadows (Neo-Brutalist) */
--shadow-sm: 4px 4px 0 0 var(--color-black);
--shadow-md: 6px 6px 0 0 var(--color-black);
--shadow-lg: 8px 8px 0 0 var(--color-black);
--shadow-xl: 12px 12px 0 0 var(--color-black);

/* Inset Shadows (Pressed state) */
--shadow-inset: inset 4px 4px 0 0 var(--color-black);

/* Colored Shadows (Accent) */
--shadow-primary: 6px 6px 0 0 var(--color-primary-blue);
--shadow-danger: 6px 6px 0 0 var(--color-danger);
--shadow-success: 6px 6px 0 0 var(--color-success);
```

### Shadow Usage

- **Cards**: `--shadow-md` (6px offset)
- **Buttons**: `--shadow-sm` (4px offset), `--shadow-inset` on active
- **Modals**: `--shadow-xl` (12px offset)
- **Badges**: `--shadow-sm` (4px offset)
- **Never use soft/blurred shadows** - only hard, geometric shadows

---

## 🔲 Borders & Outlines

**Bold, high-contrast borders** are essential:

```css
/* Border Widths */
--border-thin: 1px;
--border-base: 2px;      /* Default */
--border-thick: 3px;      /* Emphasis */
--border-bold: 4px;       /* Extreme emphasis */

/* Border Colors */
--border-default: var(--color-gray-700);
--border-primary: var(--color-primary-blue);
--border-danger: var(--color-danger);
--border-success: var(--color-success);
--border-black: var(--color-black);
```

### Border Guidelines

- **Default borders**: 2px solid
- **Interactive elements**: 3px on hover
- **Critical warnings**: 4px with danger color
- **Always use solid borders** - no dashed/dotted (except for focus states)

---

## 🧩 Component Library

### Atoms (Basic Building Blocks)

#### Button

**Variants:**
- `primary` - Gradient background (blue → pink)
- `secondary` - Solid blue background
- `danger` - Solid red/pink background
- `ghost` - Transparent with border
- `text` - Text only, no background

**Sizes:**
- `sm` - 32px height, padding 8px 16px
- `md` - 40px height, padding 12px 24px (default)
- `lg` - 48px height, padding 16px 32px
- `xl` - 56px height, padding 20px 40px

**States:**
- Default: Hard shadow (4-6px offset)
- Hover: Shadow increases, slight color shift
- Active: Inset shadow (pressed effect)
- Disabled: Reduced opacity, no shadow

**Example:**
```html
<button class="btn btn-primary btn-lg">
  Connect Wallet
</button>
```

#### Input

**Characteristics:**
- Bold 2-3px border
- High contrast background
- Monospace font for addresses
- Clear focus state (thick border + colored shadow)
- No rounded corners (or minimal 4px)

**States:**
- Default: 2px border, `--color-surface` background
- Focus: 3px border, colored shadow
- Error: 3px red border, red shadow
- Disabled: Reduced opacity, no interaction

#### Badge

**Variants:**
- `success` - Green with black border
- `warning` - Amber with black border
- `danger` - Red with black border
- `info` - Blue with black border
- `neutral` - Gray with black border

**Sizes:**
- `sm` - 20px height
- `md` - 24px height (default)
- `lg` - 28px height

### Molecules (Combined Components)

#### Wallet Address Display

**Components:**
- Monospace font
- Copy button (icon + text)
- Truncation with ellipsis
- Explorer link
- Visual separator (pipe or dot)

**Layout:**
```
[Icon] [Address (truncated)] [Copy] [Explorer]
```

#### Risk Score Card

**Elements:**
- Large score number (display size)
- Color-coded background (green/amber/red)
- Hard shadow
- Bold border
- Breakdown list below

#### Transaction Details

**Structure:**
- Header with icon + title
- Key-value pairs (bold labels)
- Expandable sections
- Monospace for addresses/amounts
- Clear visual hierarchy

### Organisms (Complex Components)

#### Wallet Analysis Result

**Sections:**
1. **Header**: Risk score, severity badge, timestamp
2. **Threats List**: Expandable cards for each detection
3. **Affected Assets**: List of compromised tokens/NFTs
4. **Recommendations**: Actionable steps with buttons
5. **Raw Data**: Collapsible technical details

**Layout:**
- Vertical stack with clear separation
- Each section has hard shadow
- Bold borders between sections
- Progressive disclosure (expand/collapse)

#### Navigation Bar

**Elements:**
- Logo (left)
- Navigation links (center)
- Connect Wallet button (right)
- Mobile menu toggle

**Behavior:**
- Sticky header
- Bold underline on active page
- Hard shadow on scroll

---

## 🎯 Web3-Specific Patterns

### Transaction Confirmation

**Critical Requirements:**
1. **Full Transaction Details** - Every field visible
2. **Address Verification** - Large, monospace, copyable
3. **Amount Display** - Bold, oversized numbers
4. **Gas Estimation** - Clear, upfront
5. **Risk Warnings** - Prominent if detected
6. **Two-Step Confirmation** - Prevent accidental clicks

**Layout:**
```
┌─────────────────────────────────┐
│  ⚠️  TRANSACTION WARNING         │
├─────────────────────────────────┤
│  From: [Address] [Copy]         │
│  To:   [Address] [Copy]         │
│  Amount: 1.5 SOL                │
│  Gas: 0.0005 SOL                │
│                                 │
│  [DETECTED: Known Drainer]      │
│                                 │
│  [Cancel]  [Confirm (2s hold)]  │
└─────────────────────────────────┘
```

### Wallet Connection Flow

**Steps:**
1. **Trigger**: Large, gradient CTA button
2. **Modal**: Full-screen or large centered
3. **Provider Selection**: Large cards with icons
4. **Status**: Clear loading/error states
5. **Success**: Confirmation with address display

### Address Input

**Features:**
- Large input field (48px+ height)
- Real-time validation (visual feedback)
- Paste detection
- QR code scanner option
- Recent addresses dropdown
- Clear error messages

---

## 📱 Responsive Design

### Breakpoints

```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
--breakpoint-2xl: 1536px; /* Extra large */
```

### Mobile Adaptations

- **Typography**: Scale down display sizes (but keep bold)
- **Spacing**: Reduce section gaps, maintain component padding
- **Shadows**: Slightly smaller offsets (4px → 3px)
- **Buttons**: Full-width on mobile, auto-width on desktop
- **Navigation**: Hamburger menu, full-screen overlay

---

## 🎨 Layout Patterns

### Container Widths

```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

### Grid System

- **12-column grid** for complex layouts
- **Flexbox** for simple component layouts
- **CSS Grid** for card grids
- **No gutters** - use gap property instead

### Common Layouts

**Centered Content:**
```css
.container {
  max-width: var(--container-lg);
  margin: 0 auto;
  padding: 0 var(--space-4);
}
```

**Card Grid:**
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-6);
}
```

---

## ♿ Accessibility

### Requirements

1. **Color Contrast**: All text meets WCAG AA (4.5:1)
2. **Focus States**: Visible, high-contrast outlines
3. **Keyboard Navigation**: Full keyboard support
4. **Screen Readers**: Semantic HTML, ARIA labels
5. **Touch Targets**: Minimum 44x44px on mobile

### Focus States

```css
/* High-contrast focus */
:focus-visible {
  outline: 3px solid var(--color-primary-blue);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-primary-blue);
}
```

---

## 🚀 Implementation

### CSS Variables Setup

Add to `global.css`:

```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-background: #0F172A;
  --color-surface: #1E293B;
  --color-primary-blue: hsl(206, 75%, 49%);
  --color-primary-pink: hsl(331, 90%, 56%);
  
  /* Typography */
  --font-primary: system-ui, sans-serif;
  --font-mono: 'Courier New', monospace;
  
  /* Spacing */
  --space-4: 1rem;
  --space-6: 1.5rem;
  
  /* Shadows */
  --shadow-md: 6px 6px 0 0 #000;
}
```

### Component Structure

```
src/
├── components/
│   ├── atoms/
│   │   ├── Button.svelte
│   │   ├── Input.svelte
│   │   └── Badge.svelte
│   ├── molecules/
│   │   ├── WalletAddress.svelte
│   │   ├── RiskScore.svelte
│   │   └── TransactionDetails.svelte
│   └── organisms/
│       ├── WalletAnalysis.svelte
│       ├── Navigation.svelte
│       └── TransactionModal.svelte
```

---

## 📚 Design Tokens Reference

### Quick Reference

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary-blue` | `hsl(206, 75%, 49%)` | Primary actions, trust |
| `--color-primary-pink` | `hsl(331, 90%, 56%)` | Urgent actions, energy |
| `--text-display-2xl` | `4.5rem` | Hero headlines |
| `--text-heading-xl` | `2.25rem` | Page titles |
| `--text-body-md` | `1rem` | Default body |
| `--space-4` | `1rem` | Base spacing |
| `--shadow-md` | `6px 6px 0 0 #000` | Card shadows |
| `--border-base` | `2px` | Default borders |

---

## 🎓 Design Principles Checklist

When creating new components, ensure:

- [ ] **Bold contrast** - High contrast ratios
- [ ] **Hard shadows** - No soft blurs
- [ ] **Oversized typography** - Clear hierarchy
- [ ] **Geometric shapes** - Simple, raw forms
- [ ] **Transparency** - Show all relevant data
- [ ] **Accessibility** - WCAG AA compliant
- [ ] **Mobile-first** - Responsive by default
- [ ] **Performance** - System fonts, minimal assets

---

## 🔗 Resources

- **Logo**: `/docs/logo/logo.svg`
- **Favicon**: `/docs/favicon.svg`
- **Color Palette**: Based on logo gradient (blue → pink)
- **Font**: System fonts (no external dependencies)

---

**Last Updated**: 2025-01-XX
**Version**: 1.0.0 