
# Helius RPC API Code Examples
# ============================

## 1. getSignaturesForAddress with Pagination
## -------------------------------------------

```javascript
const HELIUS_API_KEY = 'your-api-key-here';
const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

async function getAllSignaturesForAddress(address) {
  let allSignatures = [];
  let before = null;
  const limit = 1000; // Maximum allowed

  while (true) {
    const params = [address, { limit }];
    if (before) {
      params[1].before = before;
    }

    const response = await fetch(HELIUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params
      })
    });

    const { result } = await response.json();

    if (!result || result.length === 0) break;

    allSignatures.push(...result);
    console.log(`Fetched ${result.length} signatures, total: ${allSignatures.length}`);

    // Use last signature for next pagination
    before = result[result.length - 1].signature;
  }

  return allSignatures;
}
```

## 2. Batch getTransaction Requests
## ---------------------------------

```javascript
async function getBatchTransactions(signatures) {
  const BATCH_SIZE = 100; // Process in chunks to avoid overwhelming the API
  const transactions = [];

  for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
    const batch = signatures.slice(i, i + BATCH_SIZE);

    // Create individual requests for each signature
    const requests = batch.map((sig, idx) => ({
      jsonrpc: '2.0',
      id: i + idx,
      method: 'getTransaction',
      params: [
        sig,
        {
          encoding: 'jsonParsed',
          maxSupportedTransactionVersion: 0
        }
      ]
    }));

    // Send all requests in parallel
    const responses = await Promise.all(
      requests.map(req =>
        fetch(HELIUS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req)
        }).then(r => r.json())
      )
    );

    transactions.push(...responses.map(r => r.result));
    console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}`);
  }

  return transactions;
}
```

## 3. Enhanced Transactions API (Batch Multiple Signatures)
## ---------------------------------------------------------

```javascript
async function parseTransactionsBatch(signatures) {
  const url = `https://api-mainnet.helius-rpc.com/v0/transactions/?api-key=${HELIUS_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactions: signatures  // Array of transaction signatures
    })
  });

  return await response.json();
}

// Example usage
const signatures = [
  '5rfFLBUp5YPr6rC2g1KBBW8LGZBcZ8Lvs7gKAdgrBjmQvFf6EKkgc5cpAQUTwGxDJbNqtLYkjV5vS5zVK4tb6JtP',
  '3KzX8yKZJQYKCMPQhFJvN7cZLvKmFKqHvCqvBBsQVMgJPvWLNe8tQqF7jJx9k8vY2hKqMnL5pXwR4sT6uV7wZ8'
];

const parsedTransactions = await parseTransactionsBatch(signatures);
```

## 4. getTransactionsForAddress (Recommended for HaveIBeenDrained)
## ----------------------------------------------------------------

```javascript
async function getTransactionsForAddress(address, options = {}) {
  const {
    limit = 100,
    before = null,
    until = null,
    commitment = 'finalized'
  } = options;

  let url = `https://api-mainnet.helius-rpc.com/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}`;
  url += `&limit=${limit}`;
  if (before) url += `&before=${before}`;
  if (until) url += `&until=${until}`;
  url += `&commitment=${commitment}`;

  const response = await fetch(url);
  return await response.json();
}

// Pagination example
async function getAllTransactionsForAddress(address) {
  let allTransactions = [];
  let before = null;

  while (true) {
    const transactions = await getTransactionsForAddress(address, {
      limit: 100,
      before
    });

    if (!transactions || transactions.length === 0) break;

    allTransactions.push(...transactions);
    before = transactions[transactions.length - 1].signature;

    console.log(`Fetched ${transactions.length} txs, total: ${allTransactions.length}`);
  }

  return allTransactions;
}
```

## 5. Rate Limit Handling with Exponential Backoff
## -------------------------------------------------

```javascript
class RateLimitHandler {
  constructor(maxRetries = 5) {
    this.maxRetries = maxRetries;
  }

  async fetchWithRetry(url, options, attempt = 0) {
    try {
      const response = await fetch(url, options);

      // Handle 429 rate limit error
      if (response.status === 429) {
        if (attempt >= this.maxRetries) {
          throw new Error('Max retries exceeded');
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Rate limited. Retrying in ${delay}ms...`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      return response;

    } catch (error) {
      if (attempt < this.maxRetries && error.message.includes('fetch')) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Network error. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }
}

// Usage
const rateLimiter = new RateLimitHandler();
const response = await rateLimiter.fetchWithRetry(url, { method: 'POST', ... });
```

## 6. Webhook Setup for Real-Time Monitoring
## ------------------------------------------

```javascript
async function createWebhook(config) {
  const {
    accountAddresses,
    webhookURL,
    transactionTypes = ['ANY'],
    authHeader = null
  } = config;

  const response = await fetch(
    `https://api-mainnet.helius-rpc.com/v0/webhooks`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HELIUS_API_KEY}`
      },
      body: JSON.stringify({
        accountAddresses,
        transactionTypes,
        webhookURL,
        authHeader,
        webhookType: 'enhanced'
      })
    }
  );

  return await response.json();
}

// Example: Monitor specific addresses
const webhook = await createWebhook({
  accountAddresses: ['YourWalletAddress1', 'YourWalletAddress2'],
  webhookURL: 'https://your-server.com/webhook',
  transactionTypes: ['TRANSFER', 'SWAP', 'NFT_SALE'],
  authHeader: { 'x-api-key': 'your-webhook-secret' }
});
```

## 7. Complete Wallet Analysis Pipeline
## -------------------------------------

```javascript
async function analyzeWallet(walletAddress) {
  console.log(`Analyzing wallet: ${walletAddress}`);

  // Step 1: Fetch all transactions using getTransactionsForAddress
  const transactions = await getAllTransactionsForAddress(walletAddress);
  console.log(`Found ${transactions.length} transactions`);

  // Step 2: Filter suspicious transactions
  const suspiciousPatterns = {
    largeTransfers: [],
    unknownPrograms: [],
    frequentSmallTransfers: []
  };

  transactions.forEach(tx => {
    // Check for large SOL transfers
    if (tx.nativeTransfers) {
      tx.nativeTransfers.forEach(transfer => {
        if (transfer.amount > 1_000_000_000) { // > 1 SOL
          suspiciousPatterns.largeTransfers.push(tx);
        }
      });
    }

    // Check for unknown program interactions
    if (tx.source === 'UNKNOWN') {
      suspiciousPatterns.unknownPrograms.push(tx);
    }
  });

  // Step 3: Generate report
  return {
    address: walletAddress,
    totalTransactions: transactions.length,
    suspiciousPatterns,
    riskScore: calculateRiskScore(suspiciousPatterns)
  };
}

function calculateRiskScore(patterns) {
  let score = 0;
  score += patterns.largeTransfers.length * 10;
  score += patterns.unknownPrograms.length * 5;
  return Math.min(score, 100);
}
```

## 8. Error Handling Best Practices
## ---------------------------------

```javascript
async function robustFetch(url, options) {
  try {
    const response = await fetch(url, options);

    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }

    if (response.status === 503) {
      throw new Error('SERVICE_UNAVAILABLE');
    }

    if (!response.ok) {
      throw new Error(`HTTP_ERROR_${response.status}`);
    }

    return await response.json();

  } catch (error) {
    // Log error for monitoring
    console.error('API Error:', {
      url,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // Rethrow for upstream handling
    throw error;
  }
}
```

