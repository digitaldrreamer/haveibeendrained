# Solana Blinks (Blockchain Links) Implementation Guide
## December 2025 Edition

---

## Table of Contents
1. [Current State & Overview](#current-state--overview)
2. [Official Specification](#official-specification)
3. [Implementation with Hono](#implementation-with-hono)
4. [Open Graph & Meta Tags](#open-graph--meta-tags)
5. [User Experience Flow](#user-experience-flow)
6. [Platform-Specific Rendering](#platform-specific-rendering)
7. [Error Handling & Best Practices](#error-handling--best-practices)
8. [Libraries & Tools](#libraries--tools)
9. [Testing Checklist](#testing-checklist)
10. [Common Pitfalls](#common-pitfalls)

---

## Current State & Overview

### What are Blinks? (December 2025)

**Blinks** (Blockchain Links) are shareable, metadata-rich URLs that encode Solana Actions. They transform any interactive blockchain operation into a link that can be shared across web3 and web2 platforms.

**Key Capabilities (as of Dec 2025):**
- ✅ Execute transactions directly from social media (X, Discord, Telegram)
- ✅ Display rich previews with custom icons and descriptions
- ✅ Support parameterized actions (dynamic inputs)
- ✅ Chain multiple actions together
- ✅ Return post-execution feedback
- ✅ Sign messages (experimental in sRFC 33)
- ⏳ Read-only actions (limited support)

**Ecosystem Support:**
- **Wallet Integration:** Phantom, Backpack, Solflare, Magic Eden, TrustWallet
- **Discord Bots:** Native blink expansion
- **Telegram:** Via bot integration
- **Twitter/X:** Direct unfurling
- **Web Applications:** Via @solana/actions SDK

---

## Official Specification

### Solana Actions Specification (v1.0 - December 2025)

The specification defines a request/response interaction flow:

#### 1. **Actions URL Scheme**

Three ways to detect and share actions:

```
# Explicit Action URL
solana-action:https://yourdomain.com/api/donate

# With Query Parameters (URL-encoded)
solana-action:https://yourdomain.com/api/donate?amount=1&recipient=alice

# Interstitial Site URL (Fallback for non-supporting clients)
https://example.com/?action=solana-action:https://yourdomain.com/api/donate
```

#### 2. **HTTP Methods & Endpoints**

| Method | Purpose | Response |
|--------|---------|----------|
| **OPTIONS** | CORS preflight | 204 No Content |
| **GET** | Fetch action metadata | `ActionGetResponse` |
| **POST** | Execute action (wallet address provided) | `ActionPostResponse` |

#### 3. **Required CORS Headers**

```typescript
const ACTIONS_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  'Access-Control-Expose-Headers': 'Content-Type',
};
```

**Critical:** These headers must be set on:
- All action endpoints (`/api/donate`, `/api/mint`, etc.)
- The `actions.json` file at domain root
- Both GET and OPTIONS responses

#### 4. **JSON Structure: GET Response**

```typescript
interface ActionGetResponse {
  type: 'action';
  icon: string;           // URL to image (min 200x200, ideal 1200x675)
  title: string;          // Max 60 characters
  description: string;    // Max 200 characters
  label: string;          // Button text, max 5 words, starts with verb
  disabled?: boolean;     // Show reason if action unavailable
  error?: ActionError;    // Display non-fatal error
  links?: {
    actions: LinkedAction[];  // Related actions (e.g., different amounts)
  };
}

interface LinkedAction {
  label: string;          // Button text
  href: string;           // URL with template parameters {amount}, {recipient}
  type?: 'transaction' | 'transaction+confirm' | 'post' | 'post+confirm';
  parameters?: ActionParameter[];  // Input fields for user
}

interface ActionParameter {
  name: string;           // Template variable name
  label: string;          // Display label
  required?: boolean;
  pattern?: string;       // Regex validation
  patternDescription?: string;  // Error message
  type?: 'string' | 'number' | 'email' | 'url';
  min?: string | number;  // For numbers
  max?: string | number;
}

interface ActionError {
  message: string;        // Human-readable error
}
```

#### 5. **JSON Structure: POST Request**

```typescript
interface ActionPostRequest {
  account: string;        // User's wallet public key (base58)
}
```

#### 6. **JSON Structure: POST Response**

```typescript
interface ActionPostResponse {
  transaction: string;    // Base64-encoded, serialized transaction
  message?: string;       // Transaction description (appears in wallet)
  links?: {
    next?: NextAction;    // Show after successful execution
  };
}

type NextAction = Action<'action'> | CompletedAction;

interface CompletedAction {
  type: 'completed';
  icon: string;
  title: string;
  description: string;
  label: string;
}
```

#### 7. **actions.json Root Configuration**

```typescript
interface ActionsJson {
  rules: ActionRule[];
}

interface ActionRule {
  pathPattern: string;    // Route pattern (e.g., '/donate', '/mint/*')
  apiPath: string;        // Actual API endpoint
}

// Example
const actionsJson: ActionsJson = {
  rules: [
    {
      pathPattern: '/donate',
      apiPath: '/api/actions/donate',
    },
    {
      pathPattern: '/drain-check/*',
      apiPath: '/api/actions/check-drain',
    },
  ],
};
```

---

## Implementation with Hono

### Project Structure

```
your-app/
├── src/
│   ├── api/
│   │   ├── actions/
│   │   │   ├── donate.ts
│   │   │   ├── check.ts
│   │   │   └── mint.ts
│   │   └── index.ts (Hono app setup)
│   ├── utils/
│   │   └── cors.ts
│   └── index.ts
├── public/
│   └── icons/
│       ├── donate.png
│       └── check.png
└── package.json
```

### 1. **CORS Utility Module**

```typescript
// src/utils/cors.ts
export const ACTIONS_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  'Access-Control-Expose-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export function setCorsHeaders(context: any) {
  Object.entries(ACTIONS_CORS_HEADERS).forEach(([key, value]) => {
    context.header(key, value);
  });
}
```

### 2. **Basic Donate Action (Hono)**

```typescript
// src/api/actions/donate.ts
import { Hono } from 'hono';
import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
} from '@solana/actions';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { ACTIONS_CORS_HEADERS } from '../../utils/cors';

const router = new Hono();
const DONATION_ADDRESS = 'YOUR_WALLET_PUBLIC_KEY';

// GET - Return action metadata
router.get('/', async (c) => {
  const baseUrl = new URL(c.req.url).origin;
  
  const payload: ActionGetResponse = {
    type: 'action',
    icon: `${baseUrl}/icons/donate.png`,
    title: 'Donate SOL',
    description: 'Support the Have I Been Drained project',
    label: 'Donate',
    links: {
      actions: [
        {
          label: 'Donate 0.1 SOL',
          href: `${new URL(c.req.url).pathname}?amount=0.1`,
        },
        {
          label: 'Donate 0.5 SOL',
          href: `${new URL(c.req.url).pathname}?amount=0.5`,
        },
        {
          label: 'Donate 1 SOL',
          href: `${new URL(c.req.url).pathname}?amount=1`,
        },
        {
          label: 'Custom Amount',
          href: `${new URL(c.req.url).pathname}?amount={amount}`,
          parameters: [
            {
              name: 'amount',
              label: 'SOL Amount',
              required: true,
              type: 'number',
              min: '0.01',
              max: '1000',
              pattern: '^[0-9]+(\\.[0-9]{1,2})?$',
              patternDescription: 'Enter amount in SOL (e.g., 0.5)',
            },
          ],
        },
      ],
    },
  };

  return c.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
});

// OPTIONS - CORS preflight
router.options('/', (c) => {
  return c.text('', 204, {
    ...ACTIONS_CORS_HEADERS,
  });
});

// POST - Execute donation
router.post('/', async (c) => {
  try {
    const body: ActionPostRequest = await c.req.json();
    const url = new URL(c.req.url);
    const amount = parseFloat(url.searchParams.get('amount') || '0.5');

    // Validate amount
    if (isNaN(amount) || amount <= 0 || amount > 1000) {
      return c.json(
        { message: 'Invalid donation amount' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Validate account
    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(body.account);
    } catch {
      return c.json(
        { message: 'Invalid account provided' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Create transaction
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const { blockhash } = await connection.getLatestBlockhash();

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: userPublicKey,
    });

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: new PublicKey(DONATION_ADDRESS),
        lamports: Math.round(amount * 1_000_000_000), // Convert SOL to lamports
      })
    );

    // Serialize transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
    });

    const payload: ActionPostResponse = {
      transaction: serializedTransaction.toString('base64'),
      message: `Donating ${amount} SOL to Have I Been Drained`,
    };

    return c.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (error) {
    console.error('Donation error:', error);
    return c.json(
      { message: 'Failed to create transaction' },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
});

export default router;
```

### 3. **Drain Check Action**

```typescript
// src/api/actions/check.ts
import { Hono } from 'hono';
import { ActionGetResponse, ActionPostResponse } from '@solana/actions';
import { Connection, PublicKey } from '@solana/web3.js';
import { ACTIONS_CORS_HEADERS } from '../../utils/cors';

const router = new Hono();
const connection = new Connection('https://api.mainnet-beta.solana.com');

// GET - Drain check action info
router.get('/', async (c) => {
  const baseUrl = new URL(c.req.url).origin;

  const payload: ActionGetResponse = {
    type: 'action',
    icon: `${baseUrl}/icons/check.png`,
    title: 'Check Wallet Drain Status',
    description: 'Analyze your wallet for potential security drains',
    label: 'Analyze Wallet',
    links: {
      actions: [
        {
          label: 'Check My Wallet',
          href: `${new URL(c.req.url).pathname}`,
        },
      ],
    },
  };

  return c.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
});

router.options('/', (c) => {
  return c.text('', 204, { ...ACTIONS_CORS_HEADERS });
});

// POST - Perform drain analysis
router.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate wallet
    let walletAddress: PublicKey;
    try {
      walletAddress = new PublicKey(body.account);
    } catch {
      return c.json(
        { message: 'Invalid wallet address' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Fetch transactions
    const signatures = await connection.getSignaturesForAddress(walletAddress, {
      limit: 100,
    });

    // Analyze for suspicious patterns
    let suspiciousCount = 0;
    const drainerPatterns = [
      'raydium', // Common in drain attacks
      'unknown-program',
      'token-transfer',
    ];

    for (const sig of signatures) {
      const tx = await connection.getTransaction(sig.signature);
      if (tx) {
        // Check for suspicious instruction patterns
        suspiciousCount += analyzeDrainRisk(tx);
      }
    }

    const isDrained = suspiciousCount > 5;

    const payload: ActionPostResponse = {
      transaction: '',
      message: isDrained
        ? `⚠️ Your wallet shows ${suspiciousCount} suspicious transactions`
        : `✅ Your wallet appears secure (${suspiciousCount} alerts)`,
      links: {
        next: {
          type: 'completed',
          icon: isDrained ? '⚠️' : '✅',
          title: isDrained ? 'Wallet Compromised' : 'Wallet Secure',
          description: isDrained
            ? 'Consider moving assets to a new wallet'
            : 'No drain patterns detected',
          label: 'View Full Report',
        },
      },
    };

    return c.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (error) {
    console.error('Check error:', error);
    return c.json(
      { message: 'Failed to analyze wallet' },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
});

function analyzeDrainRisk(tx: any): number {
  // Implement drain detection logic
  let risk = 0;

  // Check for unusual token transfers
  if (tx.transaction?.message?.instructions?.length > 5) risk++;

  // Check for unfamiliar programs
  if (tx.transaction?.message?.instructions?.some((i: any) => !isKnownProgram(i))) {
    risk += 2;
  }

  return risk;
}

function isKnownProgram(instruction: any): boolean {
  const knownPrograms = [
    'TokenkegQfeZyiNwAJsyFbPVwwQQfzZZFqZZTnMMUP', // Token Program
    '11111111111111111111111111111111', // System Program
    'TokenzQdBbjFD8aff3Z5DmwzkDqCqzxURvCHok4N5w9', // Token-2022
  ];

  return knownPrograms.some((prog) =>
    instruction.programId?.toString().includes(prog)
  );
}

export default router;
```

### 4. **Main Hono App & actions.json**

```typescript
// src/api/index.ts
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import donateRouter from './actions/donate';
import checkRouter from './actions/check';
import { ACTIONS_CORS_HEADERS } from '../utils/cors';

const app = new Hono().basePath('/api');

// Mount action routes
app.route('/actions/donate', donateRouter);
app.route('/actions/check', checkRouter);

// actions.json endpoint
app.get('/actions.json', (c) => {
  const actionsJson = {
    rules: [
      {
        pathPattern: '/donate',
        apiPath: '/api/actions/donate',
      },
      {
        pathPattern: '/check',
        apiPath: '/api/actions/check',
      },
    ],
  };

  return c.json(actionsJson, {
    headers: ACTIONS_CORS_HEADERS,
  });
});

app.options('/actions/donate', (c) => {
  return c.text('', 204, { ...ACTIONS_CORS_HEADERS });
});

app.options('/actions/check', (c) => {
  return c.text('', 204, { ...ACTIONS_CORS_HEADERS });
});

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
```

**In Astro/Hono setup:**
```typescript
// astro.config.mjs
export default defineConfig({
  integrations: [
    node({ mode: 'standalone' }),
    // ... other integrations
  ],
  output: 'server',
});

// pages/api/[[...route]].ts (handles /api/** routes)
import { app } from '../../../api'; // Your Hono app
export const ALL = ({ request }) => app.fetch(request);
```

---

## Open Graph & Meta Tags

### Required Meta Tags for Proper Card Rendering

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donate to Have I Been Drained</title>
  
  <!-- Standard OG Tags -->
  <meta property="og:title" content="Donate to Have I Been Drained">
  <meta property="og:description" content="Support wallet security analysis on Solana">
  <meta property="og:image" content="https://yourdomain.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="675">
  <meta property="og:image:type" content="image/png">
  <meta property="og:url" content="https://yourdomain.com">
  <meta property="og:type" content="website">
  
  <!-- Twitter Card Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Donate to Have I Been Drained">
  <meta name="twitter:description" content="Support wallet security analysis on Solana">
  <meta name="twitter:image" content="https://yourdomain.com/og-image.png">
  <meta name="twitter:site" content="@yourhandle">
  <meta name="twitter:creator" content="@yourhandle">
  
  <!-- Blink-Specific Meta Tags -->
  <meta property="og:image:secure_url" content="https://yourdomain.com/og-image.png">
  <meta name="description" content="Support wallet security analysis on Solana">
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

### Image Specifications

| Platform | Aspect Ratio | Dimensions | Format | Notes |
|----------|-------------|-----------|--------|-------|
| **OG Standard** | 1.91:1 | 1200x675 | PNG/JPG | Primary |
| **Twitter** | 1.91:1 | 1200x675 | PNG/JPG | Same as OG |
| **Discord** | 1200:630 | 1200x630 | PNG/JPG | Slightly different |
| **Blink Icon** | 1:1 | 200x200 (min), 512x512 (ideal) | PNG | Action icon |
| **Fallback** | - | - | WebP | Use with PNG fallback |

**Best Practices:**
- Compress images (< 200KB recommended)
- Use HTTPS URLs only
- Include both secure_url and regular URL
- Test with [https://imgsrc.io/tools/open-graph-debugger](https://imgsrc.io/tools/open-graph-debugger)
- Ensure images look good when cropped to square

---

## User Experience Flow

### Complete Blink Interaction Flow

```
┌─────────────────────────────────────────────────────────┐
│ User sees Blink link in social media (X, Discord, etc) │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ Client detects Blink support │
        │ (Browser, Wallet, Bot)       │
        └──────────┬───────────────────┘
                   │
         ┌─────────▼──────────┐
         │ GET /api/donate    │ (Fetch metadata)
         └─────────┬──────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │ Render Action UI with options:   │
    │ - Donate 0.1 SOL                 │
    │ - Donate 0.5 SOL                 │
    │ - Donate 1 SOL                   │
    │ - Custom Amount [Input Field]    │
    └──────────┬───────────────────────┘
               │ User selects action or enters amount
               │
    ┌──────────▼──────────────────────┐
    │ User clicks "Donate" button      │
    └──────────┬──────────────────────┘
               │
    ┌──────────▼──────────────────────────────┐
    │ Wallet connection (if not connected)    │
    │ - Prompt user to connect wallet         │
    │ - Store user's public key               │
    └──────────┬───────────────────────────────┘
               │
    ┌──────────▼─────────────────────────────┐
    │ POST /api/donate (with query params)   │
    │ Body: { account: "user_wallet_addr" }  │
    └──────────┬──────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────┐
    │ Server creates transaction:             │
    │ - Create SystemProgram.transfer()       │
    │ - Set fee payer to user's wallet        │
    │ - Get latest blockhash                  │
    │ - Serialize to base64                   │
    └──────────┬───────────────────────────────┘
               │
    ┌──────────▼─────────────────────────────────────┐
    │ Return ActionPostResponse:                     │
    │ {                                               │
    │   transaction: "base64_encoded_tx",            │
    │   message: "Donating 0.5 SOL to...",          │
    │   links: { next: {...} }  // Optional          │
    │ }                                               │
    └──────────┬──────────────────────────────────────┘
               │
    ┌──────────▼────────────────────────────────┐
    │ Wallet prompts user to sign & approve     │
    │ - Show transaction preview                │
    │ - Display message: "Donating 0.5 SOL..."  │
    │ - Sign button                             │
    └──────────┬─────────────────────────────────┘
               │ User signs
               │
    ┌──────────▼──────────────────────────────────┐
    │ Wallet broadcasts transaction to network │
    └──────────┬───────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────┐
    │ Transaction confirmed on-chain          │
    │ (client polls or receives confirmation) │
    └──────────┬───────────────────────────────┘
               │
    ┌──────────▼────────────────────────────────┐
    │ If NextAction provided:                  │
    │ - Update UI to show success page         │
    │ - Display CompletedAction metadata:      │
    │   "✅ Donation successful!"              │
    │   "Thank you for supporting security"    │
    └────────────────────────────────────────────┘
```

### Key Decision Points

**1. Parameter Passing**
```
URL: https://yourdomain.com/api/donate?amount=1&message=custom
     └─ Query parameters appear in URL
     └─ Parameters defined in action.links.actions[].parameters
     └─ Template literals: href="...?amount={amount}"
```

**2. Wallet Connection Detection**
```typescript
// Client-side flow
const isConnected = !!userWalletAddress;

if (!isConnected) {
  // Show wallet selector (Phantom, Backpack, etc.)
  // Get public key
  // Proceed with POST request
}
```

**3. Transaction Signing**
```typescript
// Wallet handles signing automatically
// User sees preview in wallet interface
// After approval, wallet broadcasts transaction
// Client receives confirmation via on-chain data
```

---

## Platform-Specific Rendering

### Platform Support Matrix (December 2025)

| Platform | Support | Notes |
|----------|---------|-------|
| **X (Twitter)** | ✅ Full | Unfurls directly, shows rich preview |
| **Discord** | ✅ Full | Bot expansion, button interaction |
| **Telegram** | ✅ Via Bot | Requires bot integration |
| **Websites/dApps** | ✅ Full | Via @solana/actions SDK |
| **Mobile Wallets** | ✅ Full | Deep linking support |
| **Browser Extensions** | ✅ Full | Phantom, Backpack, Solflare |
| **Farcaster** | ⏳ Limited | Emerging support |

### Twitter/X Rendering

```
Link Posted:
https://example.com/?action=solana-action:https://yourdomain.com/api/donate

Renders as:
┌─────────────────────────────────────┐
│ Donate to Have I Been Drained       │
│ Support wallet security analysis... │
│ [Image: donation icon]              │
├─────────────────────────────────────┤
│ [Donate 0.1 SOL] [Donate 0.5 SOL]  │
│ [Donate 1 SOL]   [Custom Amount]   │
└─────────────────────────────────────┘
```

**X-Specific Requirements:**
- OG image minimum 200x200
- Text must be UTF-8
- All links must be HTTPS
- CORS headers mandatory on all endpoints

### Discord Bot Rendering

```
Message:
Check out this Blink: solana-action:https://yourdomain.com/api/donate

Renders as:
┌──────────────────────────────────┐
│ Donate to Have I Been Drained    │
│ Support wallet security analysis │
├──────────────────────────────────┤
│ [Donate 0.1 SOL] [Donate 0.5 SOL]│
│ [Donate 1 SOL] [Custom Amount]   │
└──────────────────────────────────┘

On button click:
- User connects wallet (if needed)
- Wallet opens transaction preview
- After signing: "Transaction sent!"
```

### Telegram Bot Integration

```typescript
// Example Telegram bot with Blink support
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.command('donate', (ctx) => {
  const blinkUrl = `solana-action:https://yourdomain.com/api/donate`;
  const fallbackUrl = `https://yourdomain.com/?action=${encodeURIComponent(blinkUrl)}`;
  
  ctx.reply(
    'Donate to Have I Been Drained\nSupport wallet security analysis',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Open Blink', url: fallbackUrl }],
        ],
      },
    }
  );
});

bot.launch();
```

### Web App Integration

```typescript
// Using @solana/actions SDK in React
import { transact } from '@solana/actions';

export function BlinkComponent() {
  const handleAction = async () => {
    const actionUrl = 'solana-action:https://yourdomain.com/api/donate?amount=1';
    
    try {
      const tx = await transact(async (wallet) => {
        const response = await fetch('https://yourdomain.com/api/donate?amount=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account: wallet.publicKey.toString() }),
        });
        
        const data = await response.json();
        return data.transaction;
      });
      
      console.log('Transaction signature:', tx);
    } catch (error) {
      console.error('Action failed:', error);
    }
  };
  
  return <button onClick={handleAction}>Donate 1 SOL</button>;
}
```

---

## Error Handling & Best Practices

### Comprehensive Error Handling

```typescript
// src/api/actions/secure-donate.ts
import { ActionError } from '@solana/actions';

interface ActionErrorResponse {
  message: string;
  code?: string;
  details?: string;
}

export async function handleDonateWithErrorHandling(c: any) {
  try {
    const body = await c.req.json();

    // 1. Validate request structure
    if (!body.account) {
      return c.json(
        {
          message: 'Missing account in request body',
          code: 'MISSING_ACCOUNT',
        },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // 2. Validate account is valid public key
    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(body.account);
    } catch (error) {
      return c.json(
        {
          message: 'Invalid Solana wallet address',
          code: 'INVALID_ACCOUNT',
          details: `Received: ${body.account}`,
        },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // 3. Validate URL parameters
    const url = new URL(c.req.url);
    const amountStr = url.searchParams.get('amount');
    
    if (!amountStr) {
      return c.json(
        {
          message: 'Missing amount parameter',
          code: 'MISSING_AMOUNT',
        },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const amount = parseFloat(amountStr);

    // 4. Validate amount range
    if (isNaN(amount)) {
      return c.json(
        {
          message: 'Amount must be a valid number',
          code: 'INVALID_AMOUNT',
        },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    if (amount <= 0) {
      return c.json(
        {
          message: 'Amount must be greater than 0',
          code: 'AMOUNT_TOO_LOW',
          details: `Received: ${amount}`,
        },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    if (amount > 1000) {
      return c.json(
        {
          message: 'Amount exceeds maximum limit of 1000 SOL',
          code: 'AMOUNT_TOO_HIGH',
          details: `Received: ${amount}`,
        },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // 5. Check wallet balance (optional but recommended)
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const balance = await connection.getBalance(userPublicKey);
    const balanceInSol = balance / 1_000_000_000;

    if (balanceInSol < amount) {
      return c.json(
        {
          message: `Insufficient balance. Your balance: ${balanceInSol} SOL`,
          code: 'INSUFFICIENT_BALANCE',
        },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // 6. Create transaction with error handling
    let transaction: Transaction;
    try {
      const { blockhash } = await connection.getLatestBlockhash('finalized');

      transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: userPublicKey,
      });

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: new PublicKey(DONATION_ADDRESS),
          lamports: Math.round(amount * 1_000_000_000),
        })
      );
    } catch (error) {
      console.error('Transaction creation error:', error);
      return c.json(
        {
          message: 'Failed to create transaction',
          code: 'TRANSACTION_CREATION_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // 7. Serialize transaction
    let serializedTransaction: string;
    try {
      const buffer = transaction.serialize({ requireAllSignatures: false });
      serializedTransaction = buffer.toString('base64');
    } catch (error) {
      console.error('Serialization error:', error);
      return c.json(
        {
          message: 'Failed to serialize transaction',
          code: 'SERIALIZATION_ERROR',
        },
        { status: 500, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // 8. Success response
    const payload: ActionPostResponse = {
      transaction: serializedTransaction,
      message: `Donating ${amount} SOL to Have I Been Drained`,
      links: {
        next: {
          type: 'completed',
          icon: '✅',
          title: 'Donation Successful',
          description: 'Thank you for supporting wallet security',
          label: 'View Receipt',
        },
      },
    };

    return c.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return c.json(
      {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
```

### Error Response Format

All errors should follow this structure:

```typescript
interface ErrorResponse {
  message: string;        // User-friendly message
  code?: string;          // Machine-readable error code
  details?: string;       // Additional context (for debugging)
}

// Examples:
{
  message: 'Insufficient balance',
  code: 'INSUFFICIENT_BALANCE',
  details: 'Your balance: 0.5 SOL, Required: 1 SOL',
}

{
  message: 'Invalid wallet address',
  code: 'INVALID_ACCOUNT',
  details: 'Must be a valid base58-encoded Solana address',
}
```

### Recommended Error Codes

- `MISSING_ACCOUNT` - No account in POST body
- `INVALID_ACCOUNT` - Invalid public key format
- `MISSING_AMOUNT` - No amount parameter
- `INVALID_AMOUNT` - Amount not a number
- `AMOUNT_TOO_LOW` - Amount ≤ 0
- `AMOUNT_TOO_HIGH` - Amount exceeds limit
- `INSUFFICIENT_BALANCE` - Wallet lacks funds
- `TRANSACTION_CREATION_ERROR` - Failed to create tx
- `SERIALIZATION_ERROR` - Failed to serialize
- `NETWORK_ERROR` - RPC failure
- `RATE_LIMIT` - Too many requests
- `INTERNAL_ERROR` - Unexpected server error

---

## Libraries & Tools

### Official Packages

#### 1. **@solana/actions** (Official SDK)
```bash
npm install @solana/actions @solana/web3.js
```

**Key Exports:**
```typescript
import {
  ACTIONS_CORS_HEADERS,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  createPostResponse,
  createActionHeaders,
} from '@solana/actions';
```

**Usage:**
```typescript
import { createPostResponse } from '@solana/actions';

const response = await createPostResponse({
  fields: {
    transaction: serializedTx,
    message: 'Transaction details',
  },
});
```

#### 2. **@solana/web3.js** (Core SDK)
```bash
npm install @solana/web3.js
```

**Essential for:**
- Creating transactions
- Managing connections
- Serializing data
- Working with public keys

#### 3. **spl-token** (Token operations)
```bash
npm install @solana/spl-token
```

**For token-based actions:**
```typescript
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
```

### Framework Integration

#### Next.js + Hono
```typescript
// pages/api/actions/[[...route]].ts
import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono().basePath('/api');

// Add routes...

export const { GET, POST, OPTIONS } = {
  GET: handle(app),
  POST: handle(app),
  OPTIONS: handle(app),
};
```

#### Astro + Hono
```typescript
// src/pages/api/[...route].ts
import { app } from '../../api'; // Your Hono instance

export async function ALL({ request }: { request: Request }) {
  return app.fetch(request);
}

export const prerender = false;
```

### Testing Tools

#### 1. **Blinker UI** (Quicknode)
- URL: https://dial.to
- Usage: `https://dial.to/?action=solana-action:YOUR_URL`
- Test: Click buttons, change parameters, see responses

#### 2. **curl** (Local Testing)
```bash
# Test GET endpoint
curl -X GET "http://localhost:3000/api/actions/donate" \
  -H "Origin: http://localhost:3000"

# Test POST endpoint
curl -X POST "http://localhost:3000/api/actions/donate?amount=1" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"account":"YOUR_WALLET_ADDRESS"}'

# Test OPTIONS (preflight)
curl -X OPTIONS "http://localhost:3000/api/actions/donate" \
  -H "Origin: http://localhost:3000"
```

#### 3. **Postman**
1. Create request to `http://localhost:3000/api/actions/donate`
2. Headers → Add "Origin: http://localhost:3000"
3. Send GET to see metadata
4. Body → raw JSON: `{"account":"YOUR_WALLET"}`
5. Send POST to test transaction creation

#### 4. **Open Graph Debugger**
- URL: https://imgsrc.io/tools/open-graph-debugger
- Test meta tag rendering across platforms

### Recommended Libraries for "Have I Been Drained"

```json
{
  "dependencies": {
    "@solana/actions": "^1.3.0",
    "@solana/web3.js": "^1.95.0",
    "@solana/spl-token": "^0.4.0",
    "hono": "^4.0.0",
    "astro": "^4.0.0",
    "svelte": "^4.0.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## Testing Checklist

### Pre-Deployment Testing

#### Configuration
- [ ] CORS headers set on all action endpoints
- [ ] CORS headers set on actions.json file
- [ ] All image URLs are HTTPS
- [ ] OG meta tags correctly set in HTML
- [ ] actions.json file at root domain (`https://yourdomain.com/actions.json`)
- [ ] API routes respond to GET, POST, and OPTIONS

#### Functionality
- [ ] GET endpoint returns valid `ActionGetResponse`
- [ ] POST endpoint creates valid base64-serialized transaction
- [ ] Parameter validation working (min/max/pattern)
- [ ] Error responses include proper error codes
- [ ] Error responses don't crash on invalid input
- [ ] Transaction fee payer correctly set
- [ ] Recent blockhash included in transaction
- [ ] NextAction rendering after success

#### Wallet Integration
- [ ] Phantom wallet can parse and sign transaction
- [ ] Backpack wallet can parse and sign transaction
- [ ] Solflare wallet can parse and sign transaction
- [ ] Wallet shows correct message (e.g., "Donating 0.5 SOL...")
- [ ] Wallet fee estimation is accurate

#### Platform-Specific
- [ ] X/Twitter card renders correctly
  - [ ] Title appears
  - [ ] Description appears
  - [ ] Image displays properly
  - [ ] Blink buttons render
- [ ] Discord embed shows action buttons
- [ ] Telegram bot link works
- [ ] dial.to/?action=URL renders correctly

#### Security
- [ ] No secrets in client-side code
- [ ] Rate limiting implemented
- [ ] Input validation on all parameters
- [ ] No SQL injection vectors (if using DB)
- [ ] Transaction validation on server-side
- [ ] No wallet private keys exposed

#### Performance
- [ ] GET endpoint responds < 500ms
- [ ] POST endpoint responds < 2s (includes network)
- [ ] No memory leaks in long-running tests
- [ ] Connection pooling working
- [ ] Caching implemented where possible

#### Error Scenarios
- [ ] Invalid wallet address handled
- [ ] Missing parameters handled
- [ ] Out-of-range amounts handled
- [ ] Insufficient balance handled
- [ ] Network timeout handled
- [ ] RPC failure handled
- [ ] Invalid JSON in POST body handled

### Manual Testing Script

```typescript
// tests/blinks.test.ts
async function testBlinkEndpoint() {
  const baseUrl = 'http://localhost:3000/api/actions/donate';

  console.log('🧪 Testing GET /api/actions/donate');
  const getRes = await fetch(baseUrl, { method: 'GET' });
  const getBody = await getRes.json();
  console.log('✅ GET successful:', getBody.title);

  console.log('\n🧪 Testing POST with valid parameters');
  const postRes = await fetch(`${baseUrl}?amount=0.5`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: 'YOUR_WALLET_ADDRESS' }),
  });
  const postBody = await postRes.json();
  console.log('✅ POST successful, transaction length:', postBody.transaction.length);

  console.log('\n🧪 Testing error: Invalid amount');
  const errorRes = await fetch(`${baseUrl}?amount=invalid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: 'YOUR_WALLET_ADDRESS' }),
  });
  const errorBody = await errorRes.json();
  console.log('✅ Error handled:', errorBody.message);

  console.log('\n🧪 Testing CORS headers');
  const corsRes = await fetch(baseUrl, {
    method: 'OPTIONS',
    headers: { 'Origin': 'https://x.com' },
  });
  console.log('✅ CORS Origin:', corsRes.headers.get('Access-Control-Allow-Origin'));
}

testBlinkEndpoint().catch(console.error);
```

---

## Common Pitfalls

### 1. **Missing or Incorrect CORS Headers**
```typescript
❌ WRONG - Missing headers
export const GET = async (req: Request) => {
  return Response.json({ /* ... */ });
};

✅ CORRECT - Include CORS headers
export const GET = async (req: Request) => {
  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
};
```

### 2. **Missing actions.json**
```typescript
❌ WRONG - No root mapping file
// Users can't find your actions via normal URLs

✅ CORRECT - Create actions.json at domain root
// https://yourdomain.com/actions.json
{
  "rules": [
    { "pathPattern": "/donate", "apiPath": "/api/actions/donate" }
  ]
}
```

### 3. **Invalid Public Key Handling**
```typescript
❌ WRONG - Crashes on invalid key
const userPublicKey = new PublicKey(body.account);

✅ CORRECT - Validate before use
let userPublicKey: PublicKey;
try {
  userPublicKey = new PublicKey(body.account);
} catch (err) {
  return c.json(
    { message: 'Invalid account' },
    { status: 400, headers: ACTIONS_CORS_HEADERS }
  );
}
```

### 4. **Forgetting requireAllSignatures: false**
```typescript
❌ WRONG - User can't sign (requires all signatures)
const buffer = transaction.serialize();

✅ CORRECT - Allow unsigned transaction
const buffer = transaction.serialize({
  requireAllSignatures: false,
});
```

### 5. **Missing Recent Blockhash**
```typescript
❌ WRONG - Transaction will fail
const transaction = new Transaction();
transaction.add(instruction);

✅ CORRECT - Always include blockhash
const { blockhash } = await connection.getLatestBlockhash();
const transaction = new Transaction({
  recentBlockhash: blockhash,
  feePayer: userPublicKey,
});
```

### 6. **HTTP Instead of HTTPS**
```typescript
❌ WRONG - Won't work in most clients
icon: 'http://yourdomain.com/icon.png'

✅ CORRECT - Use HTTPS always
icon: 'https://yourdomain.com/icon.png'
```

### 7. **Inefficient Parameter Handling**
```typescript
❌ WRONG - No parameter validation
href: '/api/donate?amount={amount}'
// What if amount is negative? Not a number?

✅ CORRECT - Validate with pattern & constraints
{
  href: '/api/donate?amount={amount}',
  parameters: [{
    name: 'amount',
    pattern: '^[0-9]+(\\.[0-9]{1,2})?$',
    patternDescription: 'Valid SOL amount (e.g., 1.50)',
    min: '0.01',
    max: '1000',
  }]
}
```

### 8. **Not Handling POST Body Parsing Errors**
```typescript
❌ WRONG - Crashes on invalid JSON
const body = await c.req.json();

✅ CORRECT - Catch and handle gracefully
let body;
try {
  body = await c.req.json();
} catch (err) {
  return c.json(
    { message: 'Invalid JSON in request body' },
    { status: 400, headers: ACTIONS_CORS_HEADERS }
  );
}
```

### 9. **Exposing Secrets in Responses**
```typescript
❌ WRONG - Exposes private data
return c.json({
  transaction: serializedTx,
  databaseId: 12345,
  internalError: error.message,
});

✅ CORRECT - Only return necessary data
return c.json({
  transaction: serializedTx,
  message: 'Transaction created',
});
```

### 10. **Testing Only in One Platform**
```typescript
❌ WRONG - Works in Phantom, breaks in Discord
// Only tested with web wallet

✅ CORRECT - Test across multiple platforms
- [ ] Phantom (extension)
- [ ] Backpack (extension)
- [ ] Discord (bot)
- [ ] X/Twitter (unfurl)
- [ ] dial.to (simulator)
```

---

## Advanced Topics

### Action Chaining

Link multiple actions together:

```typescript
const firstAction: ActionGetResponse = {
  type: 'action',
  // ... metadata ...
  links: {
    actions: [
      {
        label: 'Proceed to Payment',
        href: '/api/payment?token=abc123',
      },
    ],
  },
};

// User completes first action, then second automatically appears
const paymentAction: ActionPostResponse = {
  transaction: serializedTx,
  links: {
    next: {
      type: 'action',
      // Show next step (mint NFT, etc.)
    },
  },
};
```

### Wallet Connection Detection

```typescript
// Check if wallet is already connected in Blink client
const isWalletConnected = !!new URLSearchParams(location.search).get('account');

if (!isWalletConnected) {
  // Show wallet selector UI
  // Blink client handles this automatically
}
```

### Rate Limiting

```typescript
import { RateLimiter } from 'limiter'; // or similar library

const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'minute',
});

app.post('/api/actions/donate', async (c) => {
  const walletAddress = // ... extract from POST ...
  
  const success = await limiter.tryRemoveTokens(1);
  if (!success) {
    return c.json(
      { message: 'Rate limit exceeded' },
      { status: 429, headers: ACTIONS_CORS_HEADERS }
    );
  }
  
  // ... proceed ...
});
```

### Callback for Off-Chain Processing

```typescript
// After user signs, optionally call a callback
const payload: ActionPostResponse = {
  transaction: serializedTx,
  message: 'Donation processing...',
  links: {
    // This URL will be called after successful on-chain confirmation
    callback: 'https://yourdomain.com/api/callback/donation',
  },
};

// Callback endpoint
app.post('/api/callback/donation', async (c) => {
  const { signature } = await c.req.json();
  
  // Verify transaction on-chain
  const tx = await connection.getTransaction(signature);
  
  // Log to database, send email, etc.
  await db.donations.insert({
    signature,
    amount,
    timestamp: new Date(),
  });
  
  return c.json({ success: true });
});
```

---

## Cost Considerations

### Free/Generous Services (As of December 2025)

#### RPC Providers
| Provider | Free Tier | Limit | Best For |
|----------|-----------|-------|----------|
| **Helius** | Yes | 10K requests/day | Production |
| **QuickNode** | Yes | 250M compute units/month | Development |
| **Solana Labs RPC** | Yes | Community | Testing |
| **Alchemy Solana** | Yes (limited) | 100K requests/month | Small projects |

#### Hosting
| Provider | Free Tier | Limits | Notes |
|----------|-----------|--------|-------|
| **Vercel** | Yes | 100 GB bandwidth/month | Hono + Next.js |
| **Netlify** | Yes | 300 minutes/month | Astro frontend |
| **Railway** | Yes | $5/month credits | Node.js backend |
| **Render** | Yes (with auto-sleep) | No credit card required | Full-stack |

#### Database
| Provider | Free Tier | Notes |
|-----------|-----------|-------|
| **Supabase** | Yes | PostgreSQL (500MB) |
| **PlanetScale** | Yes | MySQL (5GB) |
| **MongoDB Atlas** | Yes | NoSQL (512MB) |
| **Neon** | Yes | PostgreSQL (3GB) |

#### File Storage
| Provider | Free Tier | Limits |
|-----------|-----------|--------|
| **Cloudflare R2** | No free tier | $0.015/GB (cheap) |
| **AWS S3** | Free tier | 5GB for 12 months |
| **Google Cloud Storage** | Free tier | 5GB/month |
| **Backblaze B2** | Yes | $6/TB (very cheap) |

### Estimated Monthly Costs

**Small Project (100K monthly actions):**
- RPC: $0-10 (Helius free → $50 if over limit)
- Hosting: $0-10 (Vercel free)
- Database: $0 (Supabase free)
- Storage: $0 (free tier)
- **Total: $0-15/month**

**Medium Project (10M monthly actions):**
- RPC: $100-200 (Helius, QuickNode)
- Hosting: $20-50 (Vercel pro or equivalent)
- Database: $30-50 (Supabase, Neon)
- Storage: $10-20
- **Total: $160-320/month**

**Recommendation for Have I Been Drained:**
1. Use **Helius** (free tier + $0.05 per 1M requests)
2. Host on **Vercel** (Astro + Hono)
3. Use **Supabase** for PostgreSQL
4. Use **Cloudflare R2** for media ($0.015/GB)

---

## Deployment Checklist

### Pre-Deployment
- [ ] All endpoints tested locally
- [ ] CORS headers verified
- [ ] Meta tags validated with OG debugger
- [ ] Error handling tested
- [ ] Rate limiting configured
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Secrets not in code

### Deployment
- [ ] Domain DNS configured
- [ ] SSL certificate valid (HTTPS only)
- [ ] actions.json deployed at root
- [ ] All image URLs updated to production
- [ ] API routes deployed and tested
- [ ] Database backups configured

### Post-Deployment
- [ ] Test in actual Phantom wallet
- [ ] Test in Discord bot
- [ ] Test in X/Twitter unfurl
- [ ] Monitor error logs
- [ ] Set up alerting
- [ ] Document API for team

---

## References

### Official Documentation
- **Solana Actions Docs:** https://solana.com/developers/guides/advanced/actions
- **@solana/actions NPM:** https://www.npmjs.com/package/@solana/actions
- **GitHub Examples:** https://github.com/solana-developers/solana-actions

### Testing Tools
- **Dial.to Blink UI:** https://dial.to
- **OG Debugger:** https://imgsrc.io/tools/open-graph-debugger
- **QuickNode Inspector:** https://inspector.solana.com

### Community Resources
- **Solana Developer Forum:** https://forum.solana.com
- **Solana Discord:** https://discord.com/invite/solana
- **Awesome Blinks:** https://github.com/solana-developers/awesome-blinks

---

**Last Updated:** December 2025  
**Specification Version:** Solana Actions v1.0  
**Recommended Stack:** Astro + Hono + Vercel + Helius + Supabase
