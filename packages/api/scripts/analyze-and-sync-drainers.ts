#!/usr/bin/env bun

/**
 * Analyze scraped drainer reports with AI and sync to on-chain registry
 * 
 * This script:
 * 1. Loads scraped drainer data from local storage
 * 2. Analyzes each address with Mistral AI
 * 3. Submits reports to on-chain registry (if not already there)
 * 4. Updates AI metadata on-chain
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorClient } from '../src/services/anchor-client';
import { MistralAIService } from '../src/services/mistral-ai';
import { loadDrainerData } from '../src/services/drainer-data';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// Load environment variables from root .env file
const rootEnvPath = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnvPath)) {
  const envContent = readFileSync(rootEnvPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

// Configuration
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const SOLANA_NETWORK = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet';
const ANCHOR_WALLET = process.env.ANCHOR_WALLET;
const RPC_URL = process.env.SOLANA_RPC_URL || 
  (SOLANA_NETWORK === 'mainnet' 
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com');

// Parse amount from string like "1008.00 USD" or "5.5 SOL"
function parseAmount(amountStr?: string): number | undefined {
  if (!amountStr) return undefined;
  
  const match = amountStr.match(/([\d,]+\.?\d*)\s*(USD|SOL)/i);
  if (!match) return undefined;
  
  const value = parseFloat(match[1].replace(/,/g, ''));
  const unit = match[2].toUpperCase();
  
  // Convert USD to lamports (rough estimate: 1 SOL = $100, adjust as needed)
  // For now, we'll only use SOL amounts, skip USD
  if (unit === 'USD') {
    // Skip USD amounts for now - would need current SOL price
    return undefined;
  }
  
  // Convert SOL to lamports
  return Math.round(value * 1e9);
}

async function main() {
  console.log('🔍 Starting drainer analysis and sync...\n');

  // Validate environment
  if (!MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY environment variable is required');
  }

  if (!ANCHOR_WALLET) {
    throw new Error('ANCHOR_WALLET environment variable is required');
  }

  // Initialize services
  const connection = new Connection(RPC_URL, 'confirmed');
  const anchorClient = new AnchorClient(connection, ANCHOR_WALLET);
  const mistralAI = new MistralAIService(MISTRAL_API_KEY, 'mistral-small-latest');

  // Load scraped data
  console.log('📂 Loading scraped drainer data...');
  const addressMap = await loadDrainerData();
  const addresses = Object.keys(addressMap);
  
  console.log(`✅ Loaded ${addresses.length} unique drainer addresses\n`);

  if (addresses.length === 0) {
    console.log('⚠️  No drainer addresses found. Run the scraper first.');
    process.exit(0);
  }

  // Process each address
  let processed = 0;
  let submitted = 0;
  let updated = 0;
  let errors = 0;

  for (const address of addresses) {
    try {
      processed++;
      const drainerData = addressMap[address];
      
      console.log(`\n[${processed}/${addresses.length}] Processing: ${address.slice(0, 8)}...${address.slice(-4)}`);
      console.log(`   Reports: ${drainerData.reports.length}`);

      // Check if already on-chain
      const existingReport = await anchorClient.getDrainerReport(address);
      const isOnChain = existingReport !== null;

      // Analyze with AI
      console.log('   🤖 Analyzing with Mistral AI...');
      const analysis = await mistralAI.analyzeDrainer(drainerData);
      
      console.log(`   📊 Category: ${analysis.attackCategory.category} (confidence: ${analysis.confidence}%)`);
      console.log(`   🔗 Domains: ${analysis.keyDomains.length}`);
      console.log(`   📝 Summary: ${analysis.summary.slice(0, 100)}...`);

      // Submit to on-chain if not already there
      if (!isOnChain) {
        console.log('   📤 Submitting to on-chain registry...');
        
        // Calculate total amount stolen (sum all reports)
        let totalAmount = 0;
        for (const report of drainerData.reports) {
          const amount = parseAmount(report.amountLost);
          if (amount) {
            totalAmount += amount;
          }
        }

        try {
          const tx = await anchorClient.reportDrainer(
            address,
            totalAmount > 0 ? totalAmount : undefined
          );
          console.log(`   ✅ Submitted: ${tx}`);
          submitted++;
        } catch (error: any) {
          console.error(`   ❌ Failed to submit: ${error.message}`);
          errors++;
          continue;
        }
      } else {
        console.log('   ℹ️  Already on-chain, skipping submission');
      }

      // Update AI metadata (always update, even if report already exists)
      console.log('   🔄 Updating AI metadata...');
      try {
        const methods = analysis.attackMethods.map(m => m.methodId);
        const tx = await anchorClient.updateAiMetadata(
          address,
          analysis.attackCategory.categoryId,
          methods,
          analysis.summary,
          analysis.keyDomains,
          analysis.confidence
        );
        console.log(`   ✅ Metadata updated: ${tx}`);
        updated++;
      } catch (error: any) {
        console.error(`   ❌ Failed to update metadata: ${error.message}`);
        errors++;
      }

      // Rate limiting: wait a bit between requests
      if (processed < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    } catch (error: any) {
      console.error(`   ❌ Error processing ${address}: ${error.message}`);
      errors++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Total addresses: ${addresses.length}`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Submitted: ${submitted}`);
  console.log(`   Metadata updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log('='.repeat(60) + '\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

