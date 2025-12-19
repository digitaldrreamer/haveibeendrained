#!/usr/bin/env bun
/**
 * Check for incomplete reports in the dataset files
 */

import fs from 'fs';
import path from 'path';

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const apiDir = path.resolve(scriptDir, '..');
const datasetsPath = path.join(apiDir, 'storage', 'datasets', 'default');

if (!fs.existsSync(datasetsPath)) {
  console.error(`Dataset directory not found: ${datasetsPath}`);
  process.exit(1);
}

const files = fs.readdirSync(datasetsPath).filter(f => f.endsWith('.json')).sort();

const incomplete: Array<{ file: string; reportId: string; url: string; reason: string }> = [];

for (const file of files) {
  const filePath = path.join(datasetsPath, file);
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
      reason: content._incomplete ? 'marked incomplete' : 'empty extraction',
    });
  }
}

console.log(`\n📊 Found ${incomplete.length} incomplete reports out of ${files.length} total\n`);

if (incomplete.length > 0) {
  console.log('Incomplete reports:');
  incomplete.slice(0, 15).forEach(r => {
    console.log(`  - ${r.file}: ${r.reportId} (${r.reason})`);
  });
  if (incomplete.length > 15) {
    console.log(`  ... and ${incomplete.length - 15} more`);
  }
  
  // Save list to file
  const outputPath = path.join(apiDir, 'storage', 'incomplete-reports.json');
  fs.writeFileSync(outputPath, JSON.stringify(incomplete, null, 2));
  console.log(`\n💾 Saved list to: ${outputPath}`);
}

console.log(`\n✅ Complete reports: ${files.length - incomplete.length}`);
