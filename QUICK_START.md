# 🚀 Quick Start Guide

Get the application running and all features working in 5 minutes.

## Step 1: Initial Setup (One-Time)

```bash
# 1. Install dependencies
bun install

# 2. Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# 3. Setup database
cd packages/api
bun run db:push

# 4. Configure environment
cp .env.example .env
# Edit .env with your API keys (HELIUS_API_KEY, etc.)
```

## Step 2: Start the Application

```bash
# Start everything
docker compose -f docker-compose.dev.yml up

# Or start individually:
# Terminal 1: API
bun run api:dev

# Terminal 2: Frontend  
bun run frontend:dev
```

## Step 3: Runtime Setup (For On-Chain Features)

```bash
# 1. Build and deploy Anchor program
cd packages/anchor
anchor build
anchor deploy --provider.cluster devnet

# 2. Copy IDL to shared package
cp target/idl/drainer_registry.json ../shared/src/idl/drainer_registry.json

# 3. Fund wallet (devnet)
solana airdrop 2

# 4. Verify everything works
bun run verify:runtime
```

## Step 4: Verify Setup

```bash
# Check initial setup
bun run verify:setup

# Check runtime features
bun run verify:runtime

# Test API
curl http://localhost:3001/api/health
```

## 🎯 What Works Now

- ✅ **API Server** - Running on http://localhost:3001
- ✅ **Frontend** - Running on http://localhost:3000
- ✅ **Database** - PostgreSQL with schema
- ✅ **Redis** - Rate limiting and caching
- ✅ **On-Chain Registry** - After Step 3
- ✅ **Wallet Analysis** - Requires HELIUS_API_KEY
- ✅ **Solana Actions** - After Step 3

## 📚 Detailed Guides

- **[RUN_CHECKLIST.md](./RUN_CHECKLIST.md)** - Complete setup checklist
- **[RUNTIME_SETUP.md](./RUNTIME_SETUP.md)** - Runtime features setup
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Detailed tech stack setup
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Production deployment

## 🆘 Troubleshooting

```bash
# Check if services are running
docker compose ps

# View logs
docker compose logs api
docker compose logs frontend

# Restart services
docker compose restart

# Verify environment
bun run verify:setup
```

---

**Need help?** Check the detailed guides above or run `bun run verify:setup` to diagnose issues.

