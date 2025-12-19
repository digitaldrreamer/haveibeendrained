#!/usr/bin/env bun
/**
 * Script to convert logo.svg to 512x512 PNG for Blink icon compatibility
 * 
 * Usage:
 *   bun run scripts/convert-logo-to-png.ts
 * 
 * Requirements:
 *   - sharp: npm install sharp (or bun add sharp)
 *   - OR use an online converter: https://cloudconvert.com/svg-to-png
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Try to use sharp if available, otherwise provide instructions
async function convertSvgToPng() {
  try {
    // Try to import sharp
    const sharp = await import('sharp').catch(() => null);
    
    if (!sharp) {
      console.log('⚠️  sharp not installed. Installing...');
      console.log('Run: bun add sharp');
      console.log('\nAlternatively, use an online converter:');
      console.log('1. Go to https://cloudconvert.com/svg-to-png');
      console.log('2. Upload packages/frontend/src/assets/logo.svg');
      console.log('3. Set size to 512x512');
      console.log('4. Download and save to packages/api/public/icon.png');
      process.exit(1);
    }

    const svgPath = join(process.cwd(), 'packages/frontend/src/assets/logo.svg');
    const outputPath = join(process.cwd(), 'packages/api/public/icon.png');

    console.log('📖 Reading SVG from:', svgPath);
    const svgBuffer = readFileSync(svgPath);

    console.log('🔄 Converting to 512x512 PNG...');
    const pngBuffer = await sharp.default(svgBuffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toBuffer();

    // Ensure public directory exists
    const publicDir = join(process.cwd(), 'packages/api/public');
    try {
      await import('fs/promises').then(fs => fs.mkdir(publicDir, { recursive: true }));
    } catch {}

    console.log('💾 Writing PNG to:', outputPath);
    writeFileSync(outputPath, pngBuffer);

    console.log('✅ Successfully converted logo.svg to icon.png (512x512)');
    console.log('📁 Output:', outputPath);
  } catch (error) {
    console.error('❌ Error converting SVG to PNG:', error);
    console.log('\n📝 Manual conversion instructions:');
    console.log('1. Open packages/frontend/src/assets/logo.svg in a browser');
    console.log('2. Take a screenshot or use an online converter');
    console.log('3. Resize to 512x512 pixels');
    console.log('4. Save as packages/api/public/icon.png');
    process.exit(1);
  }
}

convertSvgToPng();

