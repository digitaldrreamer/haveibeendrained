#!/usr/bin/env bun

/**
 * Post-build script to fix IDL for Anchor 0.32 compatibility
 * 
 * Anchor 0.30.1 CLI generates IDL where accounts array lacks type definitions.
 * This script copies type definitions from the types array to the accounts array.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const IDL_PATH = join(process.cwd(), 'target', 'idl', 'drainer_registry.json');
const SHARED_IDL_PATH = join(process.cwd(), '..', 'shared', 'src', 'idl', 'drainer_registry.json');

function fixIdl(idlPath: string): void {
  console.log(`Fixing IDL: ${idlPath}`);
  
  const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));
  
  if (!idl.accounts || !Array.isArray(idl.accounts) || !idl.types || !Array.isArray(idl.types)) {
    console.log('IDL structure is invalid or already fixed');
    return;
  }
  
  let fixed = false;
  for (const account of idl.accounts) {
    if (!account.type) {
      const typeDef = idl.types.find((t: any) => t.name === account.name);
      if (typeDef && typeDef.type) {
        account.type = JSON.parse(JSON.stringify(typeDef.type));
        fixed = true;
        console.log(`  ✓ Fixed account: ${account.name}`);
      }
    }
  }
  
  if (fixed) {
    writeFileSync(idlPath, JSON.stringify(idl, null, 2));
    console.log(`✅ IDL fixed and saved to: ${idlPath}`);
  } else {
    console.log('No fixes needed');
  }
}

// Fix the target IDL
fixIdl(IDL_PATH);

// Copy fixed IDL to shared package
import { existsSync } from 'fs';
if (existsSync(IDL_PATH)) {
  const fixedIdl = JSON.parse(readFileSync(IDL_PATH, 'utf-8'));
  writeFileSync(SHARED_IDL_PATH, JSON.stringify(fixedIdl, null, 2));
  console.log(`✅ Copied fixed IDL to: ${SHARED_IDL_PATH}`);
}

console.log('✅ IDL fix complete');

