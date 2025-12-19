# Frontend - Have I Been Drained

**Modern web frontend for Solana wallet security checking**

Built with Astro and Svelte, featuring a beautiful UI with Tailwind CSS for checking wallet security and viewing drainer reports.

## 🚀 Features

- **Wallet Analysis UI** - Real-time wallet security checking
- **Risk Visualization** - Interactive risk score display
- **Developer Resources** - API documentation and integration guides
- **Responsive Design** - Mobile-first, works on all devices
- **Modern Stack** - Astro 5 + Svelte 5 + Tailwind CSS 4
- **Type Safety** - Full TypeScript support with shared types

## 📦 Installation

```bash
# From root directory
bun install

# Or from this directory
cd packages/frontend
bun install
```

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure:

```bash
# API endpoint
PUBLIC_API_URL=http://localhost:3001

# Site configuration
PUBLIC_SITE_URL=http://localhost:4321
```

## 🏃 Running

### Development

```bash
bun run dev
```

Frontend runs on `http://localhost:4321`

### Production Build

```bash
bun run build
bun run preview
```

## 📁 Project Structure

```
packages/frontend/
├── public/              # Static assets (favicons, images)
├── src/
│   ├── assets/         # Images, SVGs
│   ├── components/     # Astro and Svelte components
│   │   ├── Hero.astro
│   │   ├── WalletInput.svelte
│   │   ├── Navigation.astro
│   │   └── Footer.astro
│   ├── layouts/        # Page layouts
│   │   └── Layout.astro
│   ├── pages/          # Route pages
│   │   ├── index.astro
│   │   └── developers/
│   │       └── index.astro
│   └── styles/         # Global styles
│       └── global.css
└── package.json
```

## 🎨 Components

### Astro Components

- **Layout.astro** - Main page layout with navigation and footer
- **Hero.astro** - Hero section with wallet input
- **Navigation.astro** - Top navigation bar
- **Footer.astro** - Site footer with links

### Svelte Components

- **WalletInput.svelte** - Wallet address input with analysis

## 🎯 Pages

### Home (`/`)

Main landing page with:
- Hero section with wallet input
- How It Works section
- Features showcase
- Call-to-action sections

### Developers (`/developers`)

Developer resources page with:
- API documentation
- Integration guides
- Code examples
- HTML widget documentation

## 🎨 Styling

Uses Tailwind CSS 4 with custom theme:

- **Colors**: Primary (Solana blue), surface, background
- **Typography**: Custom font stack
- **Dark Mode**: Built-in dark theme support

## 🔌 API Integration

The frontend integrates with the API package via:

```typescript
import { apiClient } from '@haveibeendrained/shared/utils/api-client';

// Check wallet
const result = await apiClient.checkWallet(address);
```

## 🧪 Development

### Adding a New Page

Create a new `.astro` file in `src/pages/`:

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout>
  <h1>My New Page</h1>
</Layout>
```

### Adding a Component

**Astro Component:**
```astro
---
// src/components/MyComponent.astro
---

<div class="my-component">
  <h2>Hello World</h2>
</div>
```

**Svelte Component:**
```svelte
<!-- src/components/MyComponent.svelte -->
<script lang="ts">
  export let title: string;
</script>

<div class="my-component">
  <h2>{title}</h2>
</div>
```

## 📦 Dependencies

- **Astro** - Static site framework
- **Svelte** - Component framework
- **Tailwind CSS** - Utility-first CSS framework
- **@haveibeendrained/shared** - Shared types and utilities

## 🚀 Deployment

### Vercel

```bash
vercel deploy
```

### Netlify

```bash
netlify deploy --prod
```

### Docker

See root `Dockerfile` and `docker-compose.yml` for containerized deployment.

## 🔧 Build Configuration

Astro configuration is in `astro.config.mjs`. Key features:

- Svelte integration
- Tailwind CSS integration
- TypeScript support
- Path aliases

## 📝 Environment Variables

- `PUBLIC_API_URL` - API server URL
- `PUBLIC_SITE_URL` - Frontend site URL

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file for details.
