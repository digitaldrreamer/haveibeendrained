#!/usr/bin/env bun

/**
 * Populate Known Drainer Addresses
 * 
 * This script helps you:
 * 1. Find known drainer addresses from various sources
 * 2. Submit them to the on-chain registry
 * 3. Verify they're stored correctly
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Known drainer addresses from public sources
// ⚠️ WARNING: These are real malicious addresses - use for testing only on devnet
const KNOWN_DRAINER_ADDRESSES = [
  // Add known drainer addresses here
  // Sources:
  // - Chainabuse.com
  // - Solana security Twitter accounts
  // - On-chain analysis of drain transactions
  // - Community reports
  
  // Example format (replace with real addresses):
  // 'DrainerAddress1111111111111111111111111111111',
  // 'DrainerAddress2222222222222222222222222222222',
];

interface DrainerInfo {
  address: string;
  amountStolen?: number; // In SOL
  source?: string; // Where you found it
}

/**
 * Submit a drainer address to the on-chain registry
 */
async function submitDrainer(drainer: DrainerInfo): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drainerAddress: drainer.address,
        amountStolen: drainer.amountStolen,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Submitted: ${drainer.address.slice(0, 8)}...`);
      console.log(`   Transaction: ${data.data.transactionSignature}`);
      return true;
    } else {
      console.error(`❌ Failed: ${drainer.address.slice(0, 8)}... - ${data.error}`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Error submitting ${drainer.address.slice(0, 8)}...:`, error.message);
    return false;
  }
}

/**
 * Verify a drainer address is in the registry
 */
async function verifyDrainer(address: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/report/${address}`);
    const data = await response.json();

    if (data.success && data.data) {
      console.log(`✅ Verified: ${address.slice(0, 8)}...`);
      console.log(`   Reports: ${data.data.reportCount}`);
      return true;
    } else {
      console.log(`⚠️  Not found: ${address.slice(0, 8)}...`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Error verifying ${address.slice(0, 8)}...:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Populating Known Drainer Addresses\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  if (KNOWN_DRAINER_ADDRESSES.length === 0) {
    console.log('⚠️  No drainer addresses configured.');
    console.log('\n📝 How to find drainer addresses:');
    console.log('1. Chainabuse.com - Search for Solana drainer reports');
    console.log('2. Twitter/X - Follow @SolanaSecurity, @SlowMist_Team');
    console.log('3. Solana Forums - Check security discussions');
    console.log('4. On-chain analysis - Analyze drain transaction signatures');
    console.log('5. Community reports - Users reporting drainers');
    console.log('\n💡 Add addresses to KNOWN_DRAINER_ADDRESSES array in this file.\n');
    return;
  }

  console.log(`Found ${KNOWN_DRAINER_ADDRESSES.length} drainer addresses to submit\n`);

  let submitted = 0;
  let verified = 0;

  // Submit each drainer
  for (const address of KNOWN_DRAINER_ADDRESSES) {
    const success = await submitDrainer({
      address,
      amountStolen: undefined, // Add if known
      source: 'manual',
    });

    if (success) {
      submitted++;
      // Wait a bit between submissions to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n📊 Submission Summary:`);
  console.log(`   Submitted: ${submitted}/${KNOWN_DRAINER_ADDRESSES.length}`);

  // Verify submissions
  console.log(`\n🔍 Verifying submissions...\n`);
  for (const address of KNOWN_DRAINER_ADDRESSES) {
    const found = await verifyDrainer(address);
    if (found) verified++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Verification Summary:`);
  console.log(`   Verified: ${verified}/${KNOWN_DRAINER_ADDRESSES.length}`);
  console.log(`\n🎉 Done! Drainer addresses are now in the on-chain registry.`);
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


