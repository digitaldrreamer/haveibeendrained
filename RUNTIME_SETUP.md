# 🚀 Runtime Setup Guide - Making Features Work

This guide covers what needs to be done **at runtime** to make all features work, especially on-chain storage and other runtime-dependent features.

---

## 📋 Runtime Prerequisites Checklist

Before starting runtime setup, ensure:
- [ ] Application is running (API + Frontend)
- [ ] Database is migrated and ready
- [ ] Redis is running
- [ ] Environment variables are configured (see RUN_CHECKLIST.md)

---

## 🔗 Step 1: Anchor Program Deployment

### 1.1 Build the Anchor Program

```bash
# Option A: Build locally (if Anchor is installed)
cd packages/anchor
anchor build

# Option B: Build in Docker (recommended - matches production)
docker compose -f docker-compose.dev.yml up anchor-build
```

**What this does:**
- Compiles the Rust program
- Generates the IDL (Interface Definition Language) file
- Creates the program binary

### 1.2 Copy IDL to Shared Package

After building, the IDL must be copied to the shared package so the API can use it:

```bash
# The IDL is automatically copied by the anchor-build service
# But if building locally, manually copy it:
cp packages/anchor/target/idl/drainer_registry.json packages/shared/src/idl/drainer_registry.json
```

**Why this matters:**
- The API uses the IDL to interact with the on-chain program
- The shared package exports it for use across the monorepo
- Without the IDL, on-chain operations will fail

### 1.3 Deploy to Devnet (or Mainnet)

```bash
cd packages/anchor

# Set Solana CLI to devnet
solana config set --url https://api.devnet.solana.com

# Check your wallet balance (need SOL for deployment)
solana balance

# If balance is low, airdrop SOL (devnet only)
solana airdrop 2

# Deploy the program
anchor deploy --provider.cluster devnet

# Note the Program ID from the output
# It should match: BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2
```

**Verify deployment:**
```bash
# Check program on explorer
solana program show BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2 --url devnet

# Or visit:
# https://explorer.solana.com/address/BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2?cluster=devnet
```

### 1.4 Verify Program ID Configuration

The program ID is read from the IDL file. Verify it matches:

```bash
# Check IDL address
cat packages/shared/src/idl/drainer_registry.json | grep -A 1 '"address"'

# Should show: "address": "BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2"
```

---

## 💰 Step 2: Wallet Funding

### 2.1 Fund Your Anchor Wallet

The Anchor wallet needs SOL to:
- Submit reports to the on-chain registry (0.01 SOL per report)
- Pay transaction fees
- Create PDA accounts

```bash
# Check current balance
solana balance

# If on devnet and balance is low, airdrop:
solana airdrop 2

# For mainnet, you'll need to send SOL from an exchange or another wallet
```

**Minimum recommended balances:**
- **Devnet:** 2 SOL (for testing)
- **Mainnet:** 0.5 SOL (for production operations)

### 2.2 Verify Wallet Configuration

```bash
# Check wallet path matches .env
cat .env | grep ANCHOR_WALLET

# Verify wallet file exists and is readable
solana address -k ~/.config/solana/id.json

# Or if using JSON in env var, verify it's set:
echo $ANCHOR_WALLET | head -c 50
```

---

## 🗄️ Step 3: Database Seeding (Optional but Recommended)

### 3.1 Populate Known Drainer Addresses

The application works better with initial drainer data. You have several options:

#### Option A: Use Scraped Data (If Available)

```bash
cd packages/api

# If you have scraped data in storage/datasets/
bun run analyze:sync

# This will:
# 1. Load scraped drainer addresses
# 2. Analyze them with AI (if MISTRAL_API_KEY is set)
# 3. Submit to on-chain registry
```

#### Option B: Manual Population Script

```bash
cd packages/api

# Edit scripts/populate-drainers.ts to add known drainer addresses
# Then run:
bun run populate:drainers
```

#### Option C: Scrape Chainabuse (If Needed)

```bash
cd packages/api

# Scrape drainer reports from Chainabuse
bun run scrape:chainabuse

# Then sync to on-chain:
bun run analyze:sync
```

**What gets seeded:**
- Known drainer addresses from public sources
- Metadata (amount stolen, first seen, etc.)
- On-chain registry entries (if wallet is funded)

---

## ✅ Step 4: Verify Runtime Features

### 4.1 Test On-Chain Registry

```bash
# Test reading from on-chain registry
curl http://localhost:3001/api/report/BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2

# Should return JSON with drainer report or 404 if not found
```

### 4.2 Test Report Submission

```bash
# Submit a test report (requires funded wallet)
curl -X POST http://localhost:3001/api/report \
  -H "Content-Type: application/json" \
  -d '{
    "drainerAddress": "TEST_ADDRESS_HERE",
    "amountStolen": 0.1
  }'

# Should return transaction signature if successful
```

### 4.3 Test Wallet Analysis

```bash
# Analyze a wallet (uses Helius API)
curl "http://localhost:3001/api/analyze?address=YOUR_WALLET_ADDRESS"

# Should return:
# - Risk score
# - Detected threats
# - On-chain registry matches
# - Recommendations
```

### 4.4 Test Solana Actions (Blinks)

```bash
# Check actions.json is served
curl http://localhost:3001/actions.json

# Should return:
# {
#   "rules": [
#     { "pathPattern": "/check", "apiPath": "/api/actions/check" },
#     { "pathPattern": "/report", "apiPath": "/api/actions/report" }
#   ]
# }
```

---

## 🔧 Step 5: Runtime Configuration

### 5.1 Environment Variables for Runtime Features

Ensure these are set in your `.env`:

```bash
# Required for on-chain features
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com  # or mainnet URL
ANCHOR_WALLET=~/.config/solana/id.json  # or JSON array
SOLANA_NETWORK=devnet  # or mainnet

# Required for transaction analysis
HELIUS_API_KEY=your_helius_api_key

# Optional: For AI analysis of drainers
MISTRAL_API_KEY=your_mistral_api_key  # Optional

# API configuration
API_BASE_URL=http://localhost:3001
PUBLIC_API_BASE_URL=http://localhost:3001  # For frontend
```

### 5.2 Verify Services Are Connected

```bash
# Check API can connect to database
docker exec -it haveibeendrained-api bun -e "
  import { db } from './packages/api/src/lib/db';
  const result = await db.execute('SELECT 1');
  console.log('Database:', result ? 'Connected' : 'Failed');
"

# Check API can connect to Redis
docker exec -it haveibeendrained-api bun -e "
  import { getRedisClient } from './packages/api/src/lib/redis';
  const redis = getRedisClient();
  await redis.ping();
  console.log('Redis: Connected');
"

# Check API can connect to Solana
curl http://localhost:3001/api/health
# Should return status and show no connection errors in logs
```

---

## 🎭 Step 6: Demo Mode Setup (Optional)

### 6.1 Enable Demo Mode

Demo mode provides test data for specific wallet addresses, perfect for demos and testing without requiring real wallet analysis.

**Enable demo mode:**
```bash
# Add to .env file
DEMO_MODE=true
```

**Demo Wallet Addresses:**
- Safe Wallet: `11111111111111111111111111111111` (0% risk)
- At-Risk Wallet: `ATRISK1111111111111111111111111111111` (65% risk, unlimited approvals)
- Drained Wallet: `DRAINED111111111111111111111111111111` (95% risk, SetAuthority + known drainer)
- Drainer Interaction: `DRAINER111111111111111111111111111111` (85% risk, known drainer)

**How it works:**
- Demo mode is checked before any external API calls (Helius, RPC)
- Works across all endpoints automatically
- No frontend modifications needed
- Demo wallets return instant responses with realistic test data
- Demo drainer reports work via `/api/report/:address` endpoints

**Test demo mode:**
```bash
# Test safe wallet
curl "http://localhost:3001/api/analyze?address=11111111111111111111111111111111"

# Test at-risk wallet
curl "http://localhost:3001/api/analyze?address=ATRISK1111111111111111111111111111111"

# Test drained wallet
curl "http://localhost:3001/api/analyze?address=DRAINED111111111111111111111111111111"

# Test drainer report query
curl "http://localhost:3001/api/report/DRAINED111111111111111111111111111111"
```

---

## 🎯 Step 7: Feature-Specific Runtime Setup

### 7.1 On-Chain Registry Features

**What works:**
- ✅ Reading drainer reports from on-chain registry
- ✅ Submitting new reports (requires funded wallet)
- ✅ Querying by drainer address

**What needs to be done:**
1. Program must be deployed (Step 1)
2. Wallet must be funded (Step 2)
3. IDL must be in shared package (Step 1.2)

**Test it:**
```bash
# Read a report
curl http://localhost:3001/api/report/DRAINER_ADDRESS

# Submit a report (costs 0.01 SOL)
curl -X POST http://localhost:3001/api/report \
  -H "Content-Type: application/json" \
  -d '{"drainerAddress": "ADDRESS", "amountStolen": 1.0}'
```

### 7.2 Wallet Analysis Features

**What works:**
- ✅ Transaction analysis via Helius
- ✅ Pattern detection (SetAuthority, approvals)
- ✅ Known drainer matching (from on-chain registry)

**What needs to be done:**
1. `HELIUS_API_KEY` must be set
2. On-chain registry should have data (Step 3)

**Test it:**
```bash
curl "http://localhost:3001/api/analyze?address=YOUR_WALLET"
```

### 7.3 Solana Actions (Blinks) Features

**What works:**
- ✅ Check wallet action (`/api/actions/check`)
- ✅ Report drainer action (`/api/actions/report`)

**What needs to be done:**
1. API must be running
2. `actions.json` must be accessible
3. Icon must be served at `/icon.png`

**Test it:**
```bash
# Check actions.json
curl http://localhost:3001/actions.json

# Check icon
curl -I http://localhost:3001/icon.png

# Test check action
curl "http://localhost:3001/api/actions/check?address=WALLET_ADDRESS"
```

### 7.4 Public API Features

**What works:**
- ✅ Public API endpoints (`/api/v1/*`)
- ✅ API key management
- ✅ Rate limiting

**What needs to be done:**
1. Database must be migrated (API keys table)
2. Redis must be running (for rate limiting)

**Test it:**
```bash
# Create an API key
curl -X POST http://localhost:3001/api/v1/keys \
  -H "Content-Type: application/json" \
  -d '{"appName": "Test App", "contactEmail": "test@example.com"}'

# Use the API key
curl "http://localhost:3001/api/v1/analyze?address=WALLET&apiKey=YOUR_KEY"
```

---

## 🔄 Step 8: Ongoing Runtime Maintenance

### 8.1 Keep Drainer Data Updated

```bash
# Weekly: Scrape new drainer reports
cd packages/api
bun run scrape:chainabuse

# Sync to on-chain registry
bun run analyze:sync
```

### 8.2 Monitor On-Chain Registry

```bash
# Check program account size
solana account BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2 --url devnet

# Monitor transaction activity
# Visit: https://explorer.solana.com/address/PROGRAM_ID?cluster=devnet
```

### 8.3 Monitor API Health

```bash
# Check health endpoint
curl http://localhost:3001/api/health

# Check logs for errors
docker compose logs api | tail -50
```

---

## 🚨 Troubleshooting Runtime Issues

### Issue: On-Chain Operations Fail

**Symptoms:**
- "Program not found" errors
- "Insufficient funds" errors
- IDL errors

**Solutions:**
```bash
# 1. Verify program is deployed
solana program show BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2 --url devnet

# 2. Check wallet balance
solana balance

# 3. Verify IDL exists
ls -la packages/shared/src/idl/drainer_registry.json

# 4. Check IDL address matches program ID
cat packages/shared/src/idl/drainer_registry.json | grep address
```

### Issue: Helius API Errors

**Symptoms:**
- "Invalid API key" errors
- Rate limit errors
- Transaction fetch failures

**Solutions:**
```bash
# 1. Verify API key is set
echo $HELIUS_API_KEY

# 2. Test API key
curl "https://api.helius.xyz/v0/addresses/YOUR_ADDRESS/transactions?api-key=$HELIUS_API_KEY"

# 3. Check rate limits in Helius dashboard
# Visit: https://helius.dev/dashboard
```

### Issue: Database Connection Errors

**Symptoms:**
- "Connection refused" errors
- Query timeouts

**Solutions:**
```bash
# 1. Check PostgreSQL is running
docker compose ps postgres

# 2. Verify DATABASE_URL
echo $DATABASE_URL

# 3. Test connection
docker exec -it haveibeendrained-postgres psql -U postgres -d haveibeendrained -c "SELECT 1;"
```

### Issue: Redis Connection Errors

**Symptoms:**
- Rate limiting not working
- Cache errors

**Solutions:**
```bash
# 1. Check Redis is running
docker compose ps redis

# 2. Test connection
docker exec -it haveibeendrained-redis redis-cli ping

# 3. Check Redis logs
docker compose logs redis | tail -20
```

---

## 📊 Runtime Status Checklist

Use this to verify everything is working:

- [ ] ✅ Anchor program deployed and verified
- [ ] ✅ IDL copied to shared package
- [ ] ✅ Wallet funded (minimum 0.5 SOL for devnet, 0.1 SOL for mainnet)
- [ ] ✅ Database seeded with drainer addresses (optional)
- [ ] ✅ On-chain registry queries work
- [ ] ✅ Report submission works (test with small amount)
- [ ] ✅ Wallet analysis works (uses Helius)
- [ ] ✅ Solana Actions endpoints work
- [ ] ✅ Public API endpoints work
- [ ] ✅ Rate limiting works (Redis)
- [ ] ✅ All environment variables set correctly

---

## 🎉 Quick Start Runtime Setup

For a quick setup to get everything working:

```bash
# 1. Build and deploy Anchor program
cd packages/anchor
anchor build
anchor deploy --provider.cluster devnet

# 2. Copy IDL (if not auto-copied)
cp target/idl/drainer_registry.json ../shared/src/idl/drainer_registry.json

# 3. Fund wallet
solana airdrop 2  # devnet only

# 4. Seed database (optional)
cd ../api
bun run populate:drainers  # Add addresses first

# 5. Verify everything works
curl http://localhost:3001/api/health
curl "http://localhost:3001/api/analyze?address=YOUR_WALLET"
```

---

**Last Updated:** December 2025  
**For:** Have I Been Drained? Runtime Setup

