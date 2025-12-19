#!/usr/bin/env bun

/**
 * Debug script to inspect IDL structure and understand BorshAccountsCoder initialization
 */

import { BorshCoder } from '@coral-xyz/anchor';
import idl from '@haveibeendrained/shared/idl/drainer_registry.json';

console.log('Inspecting IDL structure...\n');

console.log('1. IDL has accounts array:', Array.isArray(idl.accounts));
console.log('   Accounts count:', idl.accounts?.length || 0);
console.log('   Accounts:', idl.accounts?.map((a: any) => a.name));

console.log('\n2. IDL has types array:', Array.isArray(idl.types));
console.log('   Types count:', idl.types?.length || 0);
console.log('   Types:', idl.types?.map((t: any) => t.name));

console.log('\n3. Account structure:');
if (idl.accounts && idl.accounts.length > 0) {
  const account = idl.accounts[0];
  console.log('   Account name:', account.name);
  console.log('   Has type field:', !!account.type);
  console.log('   Type kind:', account.type?.kind);
  console.log('   Has discriminator:', !!account.discriminator);
  
  // Check if matching type exists
  const matchingType = idl.types?.find((t: any) => t.name === account.name);
  console.log('   Matching type found:', !!matchingType);
  if (matchingType) {
    console.log('   Matching type kind:', matchingType.type?.kind);
  }
}

console.log('\n4. Testing BorshCoder creation:');
try {
  const coder = new BorshCoder(idl as any);
  console.log('   ✓ BorshCoder created');
  console.log('   Has accounts property:', !!coder.accounts);
  console.log('   Accounts type:', typeof coder.accounts);
  
  if (coder.accounts) {
    console.log('   ✓ coder.accounts exists');
    // Try to access size method
    try {
      if (idl.accounts && idl.accounts.length > 0) {
        const accountName = idl.accounts[0].name;
        const size = (coder.accounts as any).size(accountName);
        console.log(`   ✓ coder.accounts.size("${accountName}") =`, size);
      }
    } catch (e: any) {
      console.log('   ✗ Error accessing size:', e.message);
    }
  } else {
    console.log('   ✗ coder.accounts is undefined');
    console.log('   Coder object keys:', Object.keys(coder));
  }
} catch (error: any) {
  console.log('   ✗ Error creating BorshCoder:', error.message);
  console.log('   Stack:', error.stack);
}



