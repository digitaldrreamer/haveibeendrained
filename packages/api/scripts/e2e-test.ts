#!/usr/bin/env bun

/**
 * End-to-End Testing Script
 * Tests the full wallet analysis flow with safe and drained wallets
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Test wallets (devnet addresses for testing)
const SAFE_WALLETS = [
  '11111111111111111111111111111111', // System Program
  '4hc5GD9JjV9UG4Nw2sxZj8smdVfD5P1nfrGmdNfT396U', // Generated test wallet
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', // Memo Program
  // Add more safe wallets here
];

const DRAINED_WALLETS = [
  // Add known drained wallet addresses here for testing
  // These should be addresses that have been reported to the registry
];

interface TestResult {
  wallet: string;
  success: boolean;
  severity?: string;
  riskScore?: number;
  detections?: number;
  error?: string;
}

async function testWallet(address: string, expectedSafe: boolean): Promise<TestResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze?address=${address}&limit=10`);
    const data = await response.json();

    if (!data.success) {
      return {
        wallet: address,
        success: false,
        error: data.error || 'Unknown error',
      };
    }

    const { severity, overallRisk, detections } = data.data;
    const isActuallySafe = severity === 'SAFE' && overallRisk === 0;

    return {
      wallet: address,
      success: expectedSafe === isActuallySafe,
      severity,
      riskScore: overallRisk,
      detections: detections.length,
      error: expectedSafe !== isActuallySafe 
        ? `Expected ${expectedSafe ? 'SAFE' : 'AT_RISK'}, got ${severity}`
        : undefined,
    };
  } catch (error: any) {
    return {
      wallet: address,
      success: false,
      error: error.message || 'Network error',
    };
  }
}

async function runTests() {
  console.log('🧪 Starting End-to-End Tests\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  const results: TestResult[] = [];

  // Test safe wallets
  console.log('📊 Testing Safe Wallets...');
  for (const wallet of SAFE_WALLETS) {
    const result = await testWallet(wallet, true);
    results.push(result);
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${wallet.slice(0, 8)}... - ${result.severity || 'ERROR'} (Risk: ${result.riskScore ?? 'N/A'}%)`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }

  // Test drained wallets
  if (DRAINED_WALLETS.length > 0) {
    console.log('\n📊 Testing Drained Wallets...');
    for (const wallet of DRAINED_WALLETS) {
      const result = await testWallet(wallet, false);
      results.push(result);
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${wallet.slice(0, 8)}... - ${result.severity || 'ERROR'} (Risk: ${result.riskScore ?? 'N/A'}%)`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
  } else {
    console.log('\n⚠️  No drained wallets configured for testing');
    console.log('   Add known drained addresses to DRAINED_WALLETS array');
  }

  // Summary
  console.log('\n📈 Test Summary');
  console.log('─'.repeat(50));
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  const accuracy = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Accuracy: ${accuracy}%`);

  if (parseFloat(accuracy) >= 90) {
    console.log('\n🎉 Tests passed! Accuracy meets 90%+ requirement.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Accuracy below 90%. Review failed tests.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


