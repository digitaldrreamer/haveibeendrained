#!/usr/bin/env bun

/**
 * Verification script to check if the application is ready to run
 * Run with: bun run scripts/verify-setup.ts
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, condition: boolean, passMessage: string, failMessage: string) {
  results.push({
    name,
    status: condition ? 'pass' : 'fail',
    message: condition ? passMessage : failMessage,
  });
}

function warn(name: string, condition: boolean, message: string) {
  results.push({
    name,
    status: condition ? 'pass' : 'warn',
    message: condition ? 'OK' : message,
  });
}

console.log('🔍 Verifying application setup...\n');

// Check 1: Bun installation
try {
  const bunVersion = Bun.version;
  check('Bun installed', true, `Bun ${bunVersion}`, 'Bun is not installed');
} catch {
  check('Bun installed', false, '', 'Bun is not installed. Install from https://bun.sh');
}

// Check 2: Docker installation
try {
  const dockerCheck = Bun.spawnSync(['docker', '--version'], { stdout: 'pipe' });
  const dockerVersion = dockerCheck.stdout.toString().trim();
  check('Docker installed', dockerCheck.exitCode === 0, dockerVersion, 'Docker is not installed');
} catch {
  check('Docker installed', false, '', 'Docker is not installed');
}

// Check 3: Docker Compose
try {
  const composeCheck = Bun.spawnSync(['docker', 'compose', 'version'], { stdout: 'pipe' });
  const composeVersion = composeCheck.stdout.toString().trim();
  check('Docker Compose', composeCheck.exitCode === 0, composeVersion, 'Docker Compose is not installed');
} catch {
  check('Docker Compose', false, '', 'Docker Compose is not installed');
}

// Check 4: Root .env file
const rootEnvPath = join(process.cwd(), '.env');
const rootEnvExists = existsSync(rootEnvPath);
check('Root .env file', rootEnvExists, 'Found .env', 'Missing .env file in project root');

// Check 5: Environment variables in .env
if (rootEnvExists) {
  const envContent = readFileSync(rootEnvPath, 'utf-8');
  const requiredVars = [
    'HELIUS_API_KEY',
    'DATABASE_URL',
    'SOLANA_NETWORK',
    'ANCHOR_PROVIDER_URL',
    'ANCHOR_WALLET',
  ];
  
  for (const varName of requiredVars) {
    const hasVar = envContent.includes(varName) && !envContent.match(new RegExp(`^#.*${varName}`));
    const varValue = envContent.split('\n').find(line => line.startsWith(varName))?.split('=')[1]?.trim();
    const isEmpty = !varValue || varValue === '' || varValue.includes('your_') || varValue.includes('YOUR_');
    
    if (hasVar && !isEmpty) {
      check(`Env: ${varName}`, true, 'Set', 'Not set or empty');
    } else {
      warn(`Env: ${varName}`, false, 'Not set or contains placeholder value');
    }
  }
}

// Check 6: Package.json files
const packageFiles = [
  'package.json',
  'packages/api/package.json',
  'packages/frontend/package.json',
  'packages/shared/package.json',
];

for (const pkgPath of packageFiles) {
  const fullPath = join(process.cwd(), pkgPath);
  check(`Package: ${pkgPath}`, existsSync(fullPath), 'Exists', 'Missing');
}

// Check 7: Node modules
const nodeModulesPaths = [
  'node_modules',
  'packages/api/node_modules',
  'packages/frontend/node_modules',
  'packages/shared/node_modules',
];

for (const nmPath of nodeModulesPaths) {
  const fullPath = join(process.cwd(), nmPath);
  warn(`Dependencies: ${nmPath}`, existsSync(fullPath), 'Run `bun install` to install dependencies');
}

// Check 8: Docker services
try {
  const psCheck = Bun.spawnSync(['docker', 'compose', 'ps', '--format', 'json'], { stdout: 'pipe' });
  if (psCheck.exitCode === 0) {
    const services = psCheck.stdout.toString().trim().split('\n').filter(Boolean);
    const postgresRunning = services.some(s => {
      try {
        const service = JSON.parse(s);
        return service.Service === 'postgres' && service.State === 'running';
      } catch {
        return false;
      }
    });
    const redisRunning = services.some(s => {
      try {
        const service = JSON.parse(s);
        return service.Service === 'redis' && service.State === 'running';
      } catch {
        return false;
      }
    });
    
    check('PostgreSQL container', postgresRunning, 'Running', 'Not running. Run: docker compose up -d postgres');
    check('Redis container', redisRunning, 'Running', 'Not running. Run: docker compose up -d redis');
  } else {
    warn('Docker services', false, 'Run: docker compose up -d postgres redis');
  }
} catch {
  warn('Docker services', false, 'Could not check Docker services');
}

// Check 9: Database schema
const schemaPath = join(process.cwd(), 'packages/api/src/lib/schema.ts');
check('Database schema', existsSync(schemaPath), 'Found', 'Missing database schema');

// Check 10: Anchor program (optional)
const anchorTomlPath = join(process.cwd(), 'packages/anchor/Anchor.toml');
warn('Anchor program', existsSync(anchorTomlPath), 'Anchor program not found (optional)');

// Print results
console.log('\n📊 Verification Results:\n');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

for (const result of results) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  const status = result.status === 'pass' ? 'PASS' : result.status === 'fail' ? 'FAIL' : 'WARN';
  console.log(`${icon} [${status}] ${result.name}: ${result.message}`);
  
  if (result.status === 'pass') passCount++;
  else if (result.status === 'fail') failCount++;
  else warnCount++;
}

console.log(`\n📈 Summary:`);
console.log(`   ✅ Passed: ${passCount}`);
console.log(`   ❌ Failed: ${failCount}`);
console.log(`   ⚠️  Warnings: ${warnCount}`);

if (failCount === 0 && warnCount === 0) {
  console.log(`\n🎉 All checks passed! Application is ready to run.`);
  console.log(`\n🚀 Start the application with:`);
  console.log(`   docker compose -f docker-compose.dev.yml up`);
} else if (failCount > 0) {
  console.log(`\n⚠️  Please fix the failed checks before running the application.`);
  process.exit(1);
} else {
  console.log(`\n⚠️  Some optional checks failed, but the application should still run.`);
}

