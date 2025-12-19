#!/usr/bin/env bun
/**
 * Identify and delete incomplete reports from the dataset
 */

import { Dataset } from 'crawlee';
import fs from 'fs';
import path from 'path';

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const apiDir = path.resolve(scriptDir, '..');
const datasetsPath = path.join(apiDir, 'storage', 'datasets', 'default');

console.log(`Checking dataset directory: ${datasetsPath}`);

if (!fs.existsSync(datasetsPath)) {
  console.error(`❌ Dataset directory not found: ${datasetsPath}`);
  console.log('Trying to open dataset via Crawlee API...');
  
  // Try using Crawlee's Dataset API
  try {
    const dataset = await Dataset.open();
    const data = await dataset.getData();
    console.log(`\n📊 Found ${data.items.length} items via Dataset API`);
    
    const incomplete: Array<{ reportId: string; url: string }> = [];
    
    for (const item of data.items) {
      const isEmpty = !item.title && 
                      (!item.addresses || item.addresses.length === 0) && 
                      (!item.domains || item.domains.length === 0) &&
                      (!item.description || item.description.includes('Solana Scam Reports'));
      
      if (isEmpty || item._incomplete) {
        incomplete.push({
          reportId: item.reportId || 'unknown',
          url: item.url || '',
        });
      }
    }
    
    console.log(`\n⚠️  Found ${incomplete.length} incomplete reports`);
    
    if (incomplete.length > 0) {
      console.log('\nIncomplete reports:');
      incomplete.slice(0, 10).forEach(r => {
        console.log(`  - ${r.reportId}`);
      });
      if (incomplete.length > 10) {
        console.log(`  ... and ${incomplete.length - 10} more`);
      }
      
      console.log('\n💡 Note: Crawlee manages dataset files internally.');
      console.log('   To remove incomplete items, you may need to:');
      console.log('   1. Clear the request queue to allow re-scraping');
      console.log('   2. Or manually filter the dataset after scraping');
    }
    
    process.exit(0);
  } catch (err: any) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

// If directory exists, check files directly
const files = fs.readdirSync(datasetsPath)
  .filter(f => f.endsWith('.json'))
  .sort();

console.log(`\n📁 Found ${files.length} JSON files in dataset directory\n`);

const incomplete: Array<{ file: string; reportId: string; url: string }> = [];

for (const file of files) {
  const filePath = path.join(datasetsPath, file);
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    const isEmpty = !content.title && 
                    (!content.addresses || content.addresses.length === 0) && 
                    (!content.domains || content.domains.length === 0) &&
                    (!content.description || content.description.includes('Solana Scam Reports'));

    if (isEmpty || content._incomplete) {
      incomplete.push({
        file,
        reportId: content.reportId || 'unknown',
        url: content.url || '',
      });
    }
  } catch (err: any) {
    console.error(`Error reading ${file}: ${err.message}`);
  }
}

console.log(`⚠️  Found ${incomplete.length} incomplete reports out of ${files.length} total\n`);

if (incomplete.length === 0) {
  console.log('✅ No incomplete reports found!');
  process.exit(0);
}

console.log('Incomplete reports:');
incomplete.slice(0, 15).forEach(r => {
  console.log(`  - ${r.file}: ${r.reportId}`);
});
if (incomplete.length > 15) {
  console.log(`  ... and ${incomplete.length - 15} more`);
}

// Ask for confirmation
console.log(`\n🗑️  Ready to delete ${incomplete.length} incomplete files...`);

// Delete the files
let deleted = 0;
for (const item of incomplete) {
  const filePath = path.join(datasetsPath, item.file);
  try {
    fs.unlinkSync(filePath);
    deleted++;
  } catch (err: any) {
    console.error(`Error deleting ${item.file}: ${err.message}`);
  }
}

console.log(`\n✅ Deleted ${deleted} incomplete files`);
console.log(`\n💡 You can now re-run the scraper. It will re-scrape these reports with improved extraction logic.`);

