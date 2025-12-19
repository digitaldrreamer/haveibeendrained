#!/usr/bin/env bun

/**
 * Runtime verification script
 * Checks if runtime features are working correctly
 * Run with: bun run scripts/verify-runtime.ts
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

const results: CheckResult[] = [];

async function check(name: string, test: () => Promise<boolean>, passMessage: string, failMessage: string) {
  try {
    const passed = await test();
    results.push({
      name,
      status: passed ? 'pass' : 'fail',
      message: passed ? passMessage : failMessage,
    });
  } catch (error: any) {
    results.push({
      name,
      status: 'fail',
      message: failMessage,
      details: error.message,
    });
  }
}

async function warn(name: string, test: () => Promise<boolean>, message: string) {
  try {
    const passed = await test();
    results.push({
      name,
      status: passed ? 'pass' : 'warn',
      message: passed ? 'OK' : message,
    });
  } catch (error: any) {
    results.push({
      name,
      status: 'warn',
      message,
      details: error.message,
    });
  }
}

console.log('🔍 Verifying runtime features...\n');
console.log(`API Base URL: ${API_BASE_URL}\n`);

// Check 1: API Health
await check(
  'API Health Endpoint',
  async () => {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  },
  'API is responding',
  'API health check failed'
);

// Check 2: Actions.json (Solana Actions)
await check(
  'Solana Actions Config',
  async () => {
    const response = await fetch(`${API_BASE_URL}/actions.json`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.rules && Array.isArray(data.rules);
  },
  'actions.json is accessible',
  'actions.json not found or invalid'
);

// Check 3: Icon.png (Solana Actions)
await check(
  'Solana Actions Icon',
  async () => {
    const response = await fetch(`${API_BASE_URL}/icon.png`);
    return response.ok && response.headers.get('content-type')?.includes('image');
  },
  'icon.png is accessible',
  'icon.png not found'
);

// Check 4: On-Chain Registry (read test)
await warn(
  'On-Chain Registry (Read)',
  async () => {
    // Try to read a known program ID as a test
    const testAddress = 'BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2';
    const response = await fetch(`${API_BASE_URL}/api/report/${testAddress}`);
    // 404 is OK (means endpoint works, just no data)
    // 500 or connection error means it's broken
    return response.status === 404 || response.ok;
  },
  'On-chain registry read endpoint works (404 is OK - means no data)'
);

// Check 5: Wallet Analysis Endpoint
await warn(
  'Wallet Analysis Endpoint',
  async () => {
    // Use a known wallet address for testing
    const testAddress = '11111111111111111111111111111111';
    const response = await fetch(`${API_BASE_URL}/api/analyze?address=${testAddress}`);
    // Should return 200 or 400 (invalid address), not 500
    return response.status !== 500;
  },
  'Wallet analysis endpoint accessible (may require HELIUS_API_KEY)'
);

// Check 6: Public API Endpoint
await warn(
  'Public API Endpoint',
  async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/health`);
    // Should return 200 or 404 (if not implemented), not 500
    return response.status !== 500;
  },
  'Public API endpoint accessible'
);

// Check 7: Database Connection (indirect test)
await warn(
  'Database Connection',
  async () => {
    // Test by checking if API can handle requests without DB errors
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    // If health endpoint works, DB is likely connected
    return response.ok;
  },
  'Database appears connected (indirect check)'
);

// Check 8: Redis Connection (indirect test)
await warn(
  'Redis Connection',
  async () => {
    // Test rate limiting endpoint (uses Redis)
    const response = await fetch(`${API_BASE_URL}/api/v1/health`);
    // If it responds (even with rate limit), Redis is likely connected
    return response.status !== 500;
  },
  'Redis appears connected (indirect check via rate limiting)'
);

// Print results
console.log('\n📊 Runtime Verification Results:\n');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

for (const result of results) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  const status = result.status === 'pass' ? 'PASS' : result.status === 'fail' ? 'FAIL' : 'WARN';
  console.log(`${icon} [${status}] ${result.name}: ${result.message}`);
  if (result.details) {
    console.log(`   Details: ${result.details}`);
  }
  
  if (result.status === 'pass') passCount++;
  else if (result.status === 'fail') failCount++;
  else warnCount++;
}

console.log(`\n📈 Summary:`);
console.log(`   ✅ Passed: ${passCount}`);
console.log(`   ❌ Failed: ${failCount}`);
console.log(`   ⚠️  Warnings: ${warnCount}`);

if (failCount === 0) {
  console.log(`\n🎉 All critical runtime checks passed!`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Deploy Anchor program (see RUNTIME_SETUP.md)`);
  console.log(`   2. Fund your wallet for on-chain operations`);
  console.log(`   3. Seed database with drainer addresses (optional)`);
} else {
  console.log(`\n⚠️  Some runtime checks failed. See RUNTIME_SETUP.md for troubleshooting.`);
  process.exit(1);
}

