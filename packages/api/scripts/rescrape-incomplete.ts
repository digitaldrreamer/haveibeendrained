#!/usr/bin/env bun
/**
 * Clear request queue and re-run scraper to re-scrape incomplete reports
 */

import { Dataset, RequestQueue } from 'crawlee';
import fs from 'fs';
import path from 'path';

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const apiDir = path.resolve(scriptDir, '..');
const storagePath = path.join(apiDir, 'storage');

console.log('🔍 Checking for incomplete reports and preparing to re-scrape...\n');

// Try to find and identify incomplete reports
let incompleteCount = 0;
const datasetsPath = path.join(storagePath, 'datasets', 'default');

if (fs.existsSync(datasetsPath)) {
  const files = fs.readdirSync(datasetsPath)
    .filter(f => f.endsWith('.json'))
    .sort();
  
  console.log(`📁 Found ${files.length} dataset files`);
  
  for (const file of files) {
    const filePath = path.join(datasetsPath, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      const isEmpty = !content.title && 
                      (!content.addresses || content.addresses.length === 0) && 
                      (!content.domains || content.domains.length === 0) &&
                      (!content.description || content.description.includes('Solana Scam Reports'));

      if (isEmpty || content._incomplete) {
        incompleteCount++;
        // Delete incomplete file
        fs.unlinkSync(filePath);
      }
    } catch (err: any) {
      console.error(`Error processing ${file}: ${err.message}`);
    }
  }
  
  if (incompleteCount > 0) {
    console.log(`🗑️  Deleted ${incompleteCount} incomplete files\n`);
  }
} else {
  console.log('📁 Dataset directory not found (may not exist yet)\n');
}

// Clear request queue to allow re-scraping
console.log('🔄 Clearing request queue to allow re-scraping...');
try {
  const requestQueue = await RequestQueue.open();
  await requestQueue.drop();
  console.log('✅ Request queue cleared\n');
} catch (err: any) {
  console.log(`⚠️  Could not clear request queue: ${err.message}\n`);
}

// Also try to clear via file system
const requestQueuesPath = path.join(storagePath, 'request_queues', 'default');
if (fs.existsSync(requestQueuesPath)) {
  const queueFiles = fs.readdirSync(requestQueuesPath);
  for (const file of queueFiles) {
    if (file.endsWith('.json') || file.endsWith('.json.lock')) {
      try {
        fs.unlinkSync(path.join(requestQueuesPath, file));
      } catch {}
    }
  }
  console.log('✅ Cleared request queue files\n');
}

console.log('✅ Ready to re-scrape!');
console.log('\n💡 Run the scraper now with:');
console.log('   bun run scripts/chainabuse-sol.ts\n');
console.log('   The improved extraction logic will handle incomplete reports better.\n');

