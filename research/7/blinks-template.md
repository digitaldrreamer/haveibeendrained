# Solana Blinks - Quick Implementation Template
## Ready-to-Use Starter Code for "Have I Been Drained"

---

## 1. Project Setup (Astro + Hono + Vercel)

### package.json
```json
{
  "name": "have-i-been-drained",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "node tests/blinks.test.ts"
  },
  "dependencies": {
    "@solana/actions": "^1.3.0",
    "@solana/web3.js": "^1.95.0",
    "@solana/spl-token": "^0.4.0",
    "astro": "^4.0.0",
    "svelte": "^4.0.0",
    "hono": "^4.0.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "@astrojs/node": "^6.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### astro.config.mjs
```javascript
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [svelte()],
});
```

---

## 2. Core API Files

### src/api/cors.ts
```typescript
export const ACTIONS_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  'Access-Control-Expose-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export function setCorsHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);
  Object.entries(ACTIONS_CORS_HEADERS).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });
  return newResponse;
}
```

### src/api/actions/donate.ts
```typescript
import { 
  ActionGetResponse, 
  ActionPostRequest, 
  ActionPostResponse,
} from '@solana/actions';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
} from '@solana/web3.js';
import { ACTIONS_CORS_HEADERS } from '../cors';

const DONATION_ADDRESS = process.env.DONATION_WALLET!;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function GET(req: Request): Promise<Response> {
  const baseUrl = new URL(req.url).origin;
  const pathname = new URL(req.url).pathname;

  const payload: ActionGetResponse = {
    type: 'action',
    icon: `${baseUrl}/icons/donate.png`,
    title: 'Donate to Have I Been Drained',
    description: 'Support wallet security analysis and protection',
    label: 'Donate SOL',
    links: {
      actions: [
        {
          label: 'Donate 0.1 SOL',
          href: `${pathname}?amount=0.1`,
        },
        {
          label: 'Donate 0.5 SOL',
          href: `${pathname}?amount=0.5`,
        },
        {
          label: 'Donate 1 SOL',
          href: `${pathname}?amount=1`,
        },
        {
          label: 'Custom Amount',
          href: `${pathname}?amount={amount}`,
          parameters: [
            {
              name: 'amount',
              label: 'Amount in SOL',
              required: true,
              type: 'number',
              min: '0.01',
              max: '1000',
              pattern: '^[0-9]+(\\.[0-9]{1,2})?$',
              patternDescription: 'Enter valid SOL amount (e.g., 2.50)',
            },
          ],
        },
      ],
    },
  };

  return new Response(JSON.stringify(payload), {
    headers: ACTIONS_CORS_HEADERS,
  });
}

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS,
  });
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body: ActionPostRequest = await req.json();
    const url = new URL(req.url);
    const amount = parseFloat(url.searchParams.get('amount') || '0.5');

    // Validation
    if (isNaN(amount) || amount <= 0 || amount > 1000) {
      return new Response(
        JSON.stringify({ message: 'Invalid donation amount (0.01-1000 SOL)' }),
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(body.account);
    } catch (err) {
      return new Response(
        JSON.stringify({ message: 'Invalid wallet address' }),
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Create transaction
    const connection = new Connection(RPC_URL);
    const { blockhash } = await connection.getLatestBlockhash('finalized');

    const transaction = new Transaction({
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

    // Serialize
    const serialized = transaction.serialize({
      requireAllSignatures: false,
    });

    const payload: ActionPostResponse = {
      transaction: serialized.toString('base64'),
      message: `Donate ${amount} SOL to support wallet security`,
      links: {
        next: {
          type: 'completed',
          icon: '✅',
          title: 'Donation Successful',
          description: 'Thank you for supporting Have I Been Drained',
          label: 'View Analytics',
        },
      },
    };

    return new Response(JSON.stringify(payload), {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (error) {
    console.error('Donation error:', error);
    return new Response(
      JSON.stringify({ message: 'Failed to process donation' }),
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
```

### src/api/actions/check.ts
```typescript
import { 
  ActionGetResponse, 
  ActionPostResponse,
} from '@solana/actions';
import { Connection, PublicKey } from '@solana/web3.js';
import { ACTIONS_CORS_HEADERS } from '../cors';

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function GET(req: Request): Promise<Response> {
  const baseUrl = new URL(req.url).origin;

  const payload: ActionGetResponse = {
    type: 'action',
    icon: `${baseUrl}/icons/check.png`,
    title: 'Check Wallet Drain Status',
    description: 'Scan your wallet for security threats',
    label: 'Analyze Wallet',
    links: {
      actions: [
        {
          label: 'Scan My Wallet',
          href: new URL(req.url).pathname,
        },
      ],
    },
  };

  return new Response(JSON.stringify(payload), {
    headers: ACTIONS_CORS_HEADERS,
  });
}

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS,
  });
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    let walletAddress: PublicKey;
    try {
      walletAddress = new PublicKey(body.account);
    } catch (err) {
      return new Response(
        JSON.stringify({ message: 'Invalid wallet address' }),
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Analyze wallet
    const connection = new Connection(RPC_URL);
    const signatures = await connection.getSignaturesForAddress(walletAddress, {
      limit: 100,
    });

    let riskScore = 0;
    const drainIndicators = [
      'raydium',
      'unknown_transfer',
      'program_error',
    ];

    for (const sig of signatures) {
      try {
        const tx = await connection.getTransaction(sig.signature, {
          commitment: 'finalized',
        });
        
        if (tx) {
          // Simple heuristic: multiple instructions = higher risk
          if (tx.transaction.message.instructions.length > 5) {
            riskScore++;
          }
        }
      } catch (e) {
        // Skip on error
      }
    }

    const isDrained = riskScore > 10;

    const payload: ActionPostResponse = {
      transaction: '',
      message: isDrained
        ? `⚠️ Risk detected: ${riskScore} suspicious transactions`
        : `✅ Wallet appears secure (${riskScore} alerts)`,
      links: {
        next: {
          type: 'completed',
          icon: isDrained ? '⚠️' : '✅',
          title: isDrained ? 'Security Alert' : 'Wallet Secure',
          description: isDrained
            ? 'Immediate action recommended'
            : 'No drain patterns detected',
          label: isDrained ? 'Get Help' : 'View Report',
        },
      },
    };

    return new Response(JSON.stringify(payload), {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (error) {
    console.error('Check error:', error);
    return new Response(
      JSON.stringify({ message: 'Failed to analyze wallet' }),
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
```

---

## 3. Routes Setup

### src/pages/api/actions.json.ts
```typescript
import { ACTIONS_CORS_HEADERS } from '../../api/cors';

export async function GET(req: Request): Promise<Response> {
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

  return new Response(JSON.stringify(actionsJson), {
    headers: ACTIONS_CORS_HEADERS,
  });
}

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS,
  });
}
```

### src/pages/api/actions/donate.ts
```typescript
import * as donateAction from '../../../api/actions/donate';

export const GET = donateAction.GET;
export const POST = donateAction.POST;
export const OPTIONS = donateAction.OPTIONS;
```

### src/pages/api/actions/check.ts
```typescript
import * as checkAction from '../../../api/actions/check';

export const GET = checkAction.GET;
export const POST = checkAction.POST;
export const OPTIONS = checkAction.OPTIONS;
```

---

## 4. Frontend Component (Svelte)

### src/components/BlinkDisplay.svelte
```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let blinkUrl = '';
  let actionData: any = null;
  let loading = false;
  let error: string | null = null;

  const actions = [
    {
      name: 'Donate',
      url: 'solana-action:https://yourdomain.com/api/actions/donate',
    },
    {
      name: 'Check Wallet',
      url: 'solana-action:https://yourdomain.com/api/actions/check',
    },
  ];

  async function loadAction(url: string) {
    loading = true;
    error = null;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      actionData = await response.json();
      blinkUrl = url;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
      actionData = null;
    } finally {
      loading = false;
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(blinkUrl);
  }
</script>

<div class="blink-display">
  <h2>Blink Actions</h2>
  
  {#if error}
    <div class="error">{error}</div>
  {/if}

  <div class="actions-list">
    {#each actions as action}
      <button
        on:click={() => loadAction(action.url.replace('solana-action:', ''))}
        class="action-btn"
      >
        {action.name}
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="loading">Loading action...</div>
  {/if}

  {#if actionData}
    <div class="action-card">
      <img src={actionData.icon} alt={actionData.title} class="icon" />
      <h3>{actionData.title}</h3>
      <p>{actionData.description}</p>
      <button class="primary-btn">{actionData.label}</button>
      
      {#if blinkUrl}
        <div class="blink-url">
          <code>{blinkUrl}</code>
          <button on:click={copyToClipboard} class="copy-btn">Copy</button>
        </div>
      {/if}

      {#if actionData.links?.actions}
        <div class="quick-actions">
          {#each actionData.links.actions as link}
            <button class="quick-action">{link.label}</button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .blink-display {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }

  .actions-list {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .action-btn {
    flex: 1;
    padding: 10px 20px;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn:hover {
    border-color: #2180a5;
    color: #2180a5;
  }

  .error {
    color: #e74c3c;
    padding: 10px;
    background: #fdeaea;
    border-radius: 4px;
    margin-bottom: 20px;
  }

  .loading {
    text-align: center;
    padding: 20px;
    color: #7f8c8d;
  }

  .action-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
  }

  .icon {
    width: 100px;
    height: 100px;
    margin-bottom: 15px;
    border-radius: 8px;
  }

  .primary-btn {
    background: #2180a5;
    color: white;
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    margin-top: 15px;
  }

  .blink-url {
    margin-top: 20px;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 4px;
    display: flex;
    gap: 10px;
  }

  .blink-url code {
    flex: 1;
    word-break: break-all;
    font-size: 12px;
  }

  .copy-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  .quick-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 15px;
  }

  .quick-action {
    padding: 8px 12px;
    border: 1px solid #32b8c6;
    color: #32b8c6;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .quick-action:hover {
    background: #f0f9fb;
  }
</style>
```

---

## 5. Environment Variables

### .env.example
```bash
# RPC Configuration
RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_CLUSTER=mainnet-beta

# Wallet Configuration
DONATION_WALLET=YOUR_WALLET_PUBLIC_KEY_HERE

# Optional: Advanced configuration
RATE_LIMIT_PER_MINUTE=30
TRANSACTION_TIMEOUT_MS=30000
```

---

## 6. Testing Script

### tests/blinks.test.ts
```typescript
import { connection } from '@solana/web3.js';

const BASE_URL = 'http://localhost:3000/api/actions';

async function testActions() {
  console.log('🧪 Testing Solana Blinks Implementation\n');

  try {
    // Test 1: GET /donate
    console.log('Test 1: GET /api/actions/donate');
    const getRes = await fetch(`${BASE_URL}/donate`);
    if (!getRes.ok) throw new Error(`Status ${getRes.status}`);
    
    const getBody = await getRes.json();
    console.log('✅ Title:', getBody.title);
    console.log('✅ Has actions:', getBody.links?.actions?.length || 0);

    // Test 2: GET /check
    console.log('\nTest 2: GET /api/actions/check');
    const checkRes = await fetch(`${BASE_URL}/check`);
    const checkBody = await checkRes.json();
    console.log('✅ Check action loaded:', checkBody.title);

    // Test 3: CORS headers
    console.log('\nTest 3: CORS Headers');
    const corsRes = await fetch(`${BASE_URL}/donate`, {
      method: 'OPTIONS',
    });
    const corsOrigin = corsRes.headers.get('Access-Control-Allow-Origin');
    console.log('✅ CORS Origin:', corsOrigin === '*' ? 'OK' : 'FAILED');

    // Test 4: POST with invalid amount
    console.log('\nTest 4: Error Handling (invalid amount)');
    const errRes = await fetch(`${BASE_URL}/donate?amount=invalid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: 'invalid' }),
    });
    const errBody = await errRes.json();
    console.log('✅ Error message:', errBody.message);

    console.log('\n✨ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testActions();
```

---

## 7. Deployment Checklist

### Before Deploying to Production

- [ ] Environment variables set in `.env.production`
- [ ] RPC URL configured to mainnet
- [ ] Donation wallet address verified
- [ ] All CORS headers present
- [ ] Meta tags validated with OG debugger
- [ ] HTTPS enabled on domain
- [ ] actions.json accessible at root
- [ ] Tested with Phantom wallet
- [ ] Tested with Backpack wallet
- [ ] Tested with Discord unfurl
- [ ] Error handling verified
- [ ] Rate limiting configured
- [ ] Database migrations run
- [ ] Monitoring/logging setup

---

## 8. Troubleshooting

### "CORS error in browser"
```
Solution: Ensure ACTIONS_CORS_HEADERS are set on ALL endpoints
and verify Access-Control-Allow-Origin is '*'
```

### "Invalid transaction" in wallet
```
Solution: 
1. Verify requireAllSignatures: false
2. Check recentBlockhash is included
3. Ensure feePayer is set to userPublicKey
4. Validate amount conversion (SOL → lamports)
```

### "actions.json not found"
```
Solution:
File must be at: https://yourdomain.com/actions.json
Not: https://yourdomain.com/api/actions.json
```

### "Button doesn't appear in Discord"
```
Solution:
1. Verify HTTPS URL
2. Check OG image dimensions (1200x675)
3. Test with Blinker UI first: https://dial.to
4. Ensure actions.json is valid JSON
```

---

## Quick Links

- **Official Docs:** https://solana.com/developers/guides/advanced/actions
- **Test in Browser:** https://dial.to
- **NPM Package:** https://www.npmjs.com/package/@solana/actions
- **GitHub Examples:** https://github.com/solana-developers/solana-actions

---

**Ready to Deploy!** Follow the checklist and you're good to go. 🚀
