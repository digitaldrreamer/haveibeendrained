#!/usr/bin/env bun

/**
 * Test script to reproduce and diagnose Anchor Program initialization issue
 */

import { Connection } from '@solana/web3.js';
import { AnchorClient } from '../src/services/anchor-client';

console.log('Testing Anchor Client initialization...\n');

try {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log('✓ Connection created');
  
  const client = new AnchorClient(connection);
  console.log('✓ AnchorClient created successfully');
  console.log('✓ Program initialized:', client ? 'YES' : 'NO');
  
  // Try to access program.account to trigger AccountClient initialization
  if (client && (client as any).program) {
    const program = (client as any).program;
    console.log('✓ Program object exists');
    console.log('✓ Program ID:', program.programId.toString());
    
    if (program.account) {
      console.log('✓ program.account exists');
      console.log('✓ Account clients:', Object.keys(program.account));
    } else {
      console.log('✗ program.account is undefined');
    }
  }
  
  console.log('\n✅ All checks passed!');
} catch (error: any) {
  console.error('\n❌ Error occurred:');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  
  // Check if it's the BorshCoder error
  if (error.message?.includes('accounts') || error.message?.includes('size')) {
    console.error('\n🔍 This appears to be the BorshAccountsCoder issue');
    console.error('The coder.accounts property is undefined');
  }
  
  process.exit(1);
}



