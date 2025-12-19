# 🚀 Application Run Checklist - 100% Sure Setup

Complete checklist to ensure the application runs successfully every time.

## ✅ Prerequisites

### Required Software
- [ ] **Bun** (v1.2+) - JavaScript runtime
  ```bash
  curl -fsSL https://bun.sh/install | bash
  bun --version
  ```

- [ ] **Docker** & **Docker Compose** - For PostgreSQL and Redis
  ```bash
  docker --version
  docker compose version
  ```

- [ ] **Anchor** (v0.32.1+) - For Solana program (if building Anchor program)
  ```bash
  anchor --version
  ```

- [ ] **Solana CLI** - For Anchor development (if building Anchor program)
  ```bash
  solana --version
  ```

### Optional (for Anchor development)
- [ ] **AVM** (Anchor Version Manager) - For managing Anchor versions
  ```bash
  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
  avm install 0.32.1
  avm use 0.32.1
  ```

---

## 🔑 Environment Variables Setup

### Root `.env` File (Required)

Create `.env` in the project root with these variables:

```bash
# Helius RPC (REQUIRED - Get from https://helius.dev)
HELIUS_API_KEY=your_helius_api_key_here

# Solana Network (REQUIRED)
SOLANA_NETWORK=devnet  # or 'mainnet'

# Database (REQUIRED - Defaults work for Docker Compose)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/haveibeendrained

# Redis (REQUIRED - Defaults work for Docker Compose)
REDIS_URL=redis://localhost:6379
# OR for Docker internal network:
REDIS_HOST=redis
REDIS_PORT=6379

# Anchor Configuration (REQUIRED for on-chain features)
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com  # or mainnet URL
# ANCHOR_WALLET can be:
# 1. JSON array directly: ANCHOR_WALLET=[1,2,3,4,...]
# 2. File path: ANCHOR_WALLET=~/.config/solana/id.json
ANCHOR_WALLET=~/.config/solana/id.json

# API Configuration (Optional - has defaults)
API_PORT=3001
API_BASE_URL=http://localhost:3001
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60

# CORS (Optional - defaults to * in dev)
CORS_ORIGIN=http://localhost:3000

# Node Environment
NODE_ENV=development
```

### Package-Specific `.env` Files

#### `packages/api/env.example` → `packages/api/.env` (Optional)
```bash
API_PORT=3001
API_BASE_URL=http://api:3001
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60
```

#### `packages/frontend/env.example` → `packages/frontend/.env` (Optional)
```bash
PUBLIC_API_BASE_URL=http://localhost:3001
```

---

## 🗄️ Database Setup

### Step 1: Start PostgreSQL and Redis
```bash
# Start Docker services (PostgreSQL + Redis)
docker compose up -d postgres redis

# Verify services are running
docker compose ps
# Should show: haveibeendrained-postgres (healthy)
#              haveibeendrained-redis (healthy)
```

### Step 2: Generate Database Schema
```bash
# Generate Drizzle migrations from schema
cd packages/api
bun run db:generate
```

### Step 3: Run Migrations
```bash
# Apply migrations to database
bun run db:migrate

# OR push schema directly (for development)
bun run db:push
```

### Step 4: Verify Database Connection
```bash
# Test database connection
docker exec -it haveibeendrained-postgres psql -U postgres -d haveibeendrained -c "\dt"
# Should show tables: api_keys
```

---

## 📦 Dependencies Installation

### Step 1: Install Root Dependencies
```bash
# From project root
bun install
```

### Step 2: Verify Workspace Installation
```bash
# Check all packages have dependencies installed
ls packages/api/node_modules | head -5
ls packages/frontend/node_modules | head -5
ls packages/shared/node_modules | head -5
```

---

## 🏗️ Build Steps

### Option A: Run with Docker Compose (Recommended)

#### Development Mode (with hot reload)
```bash
# Start all services (PostgreSQL, Redis, API, Frontend)
docker compose -f docker-compose.dev.yml up

# Or in background:
docker compose -f docker-compose.dev.yml up -d
```

#### Production Mode
```bash
# Build and start all services
docker compose up --build
```

### Option B: Run Locally (Without Docker for Services)

#### Terminal 1: Start Infrastructure
```bash
# Start only PostgreSQL and Redis
docker compose up -d postgres redis
```

#### Terminal 2: Start API
```bash
cd packages/api
bun run dev
# Should start on http://localhost:3001
```

#### Terminal 3: Start Frontend
```bash
cd packages/frontend
bun run dev
# Should start on http://localhost:3000
```

---

## ✅ Verification Checklist

### 1. Infrastructure Services
- [ ] PostgreSQL is running and healthy
  ```bash
  docker compose ps | grep postgres
  # Should show: healthy
  ```

- [ ] Redis is running and healthy
  ```bash
  docker compose ps | grep redis
  # Should show: healthy
  ```

- [ ] Database connection works
  ```bash
  docker exec -it haveibeendrained-postgres psql -U postgres -d haveibeendrained -c "SELECT 1;"
  ```

- [ ] Redis connection works
  ```bash
  docker exec -it haveibeendrained-redis redis-cli ping
  # Should return: PONG
  ```

### 2. API Server
- [ ] API starts without errors
  ```bash
  curl http://localhost:3001/
  # Should return: Hello Hono!
  ```

- [ ] Health endpoint works
  ```bash
  curl http://localhost:3001/api/health
  # Should return JSON with status
  ```

- [ ] Environment variables loaded
  ```bash
  # Check API logs for:
  # ✅ Redis ready
  # No DATABASE_URL errors
  # No HELIUS_API_KEY errors (if using Helius features)
  ```

### 3. Frontend
- [ ] Frontend starts without errors
  ```bash
  curl http://localhost:3000/
  # Should return HTML
  ```

- [ ] Frontend can reach API
  ```bash
  # Check browser console for API calls
  # Should not show CORS errors
  ```

### 4. Anchor Program (If Building)
- [ ] Anchor program builds
  ```bash
  cd packages/anchor
  anchor build
  # Should complete without errors
  ```

- [ ] IDL is generated
  ```bash
  ls packages/anchor/target/idl/*.json
  # Should show drainer_registry.json
  ```

---

## 🔧 Troubleshooting Common Issues

### Issue: Database Connection Failed
**Solution:**
```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check DATABASE_URL in .env
echo $DATABASE_URL

# Restart PostgreSQL
docker compose restart postgres
```

### Issue: Redis Connection Failed
**Solution:**
```bash
# Check Redis is running
docker compose ps redis

# Check Redis connection
docker exec -it haveibeendrained-redis redis-cli ping

# Restart Redis
docker compose restart redis
```

### Issue: API Can't Find Environment Variables
**Solution:**
```bash
# Ensure .env file exists in root
ls -la .env

# Check variables are set (no spaces around =)
cat .env | grep HELIUS_API_KEY

# Restart API service
docker compose restart api
# OR if running locally, restart the dev server
```

### Issue: Frontend Can't Reach API
**Solution:**
```bash
# Check PUBLIC_API_BASE_URL in frontend/.env
cat packages/frontend/.env

# Check API is running
curl http://localhost:3001/api/health

# Check CORS settings in API
# Should allow localhost:3000 in development
```

### Issue: Anchor Build Fails
**Solution:**
```bash
# Check Anchor version
anchor --version  # Should be 0.32.1

# Check Solana CLI
solana --version

# Check Anchor.toml configuration
cat packages/anchor/Anchor.toml

# Clean and rebuild
cd packages/anchor
anchor clean
anchor build
```

### Issue: Dependencies Not Installing
**Solution:**
```bash
# Clear Bun cache
bun pm cache rm

# Remove node_modules and reinstall
rm -rf node_modules packages/*/node_modules
bun install

# If workspace linking fails:
cd packages/api && bun install
cd ../frontend && bun install
cd ../shared && bun install
```

---

## 🎯 Quick Start Commands

### Full Setup (First Time)
```bash
# 1. Install dependencies
bun install

# 2. Start infrastructure
docker compose up -d postgres redis

# 3. Setup database
cd packages/api
bun run db:push  # or db:migrate

# 4. Start services
docker compose -f docker-compose.dev.yml up
```

### Daily Development
```bash
# Start everything
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop everything
docker compose -f docker-compose.dev.yml down
```

---

## 📋 Pre-Flight Checklist

Before running the application, ensure:

- [ ] ✅ Bun is installed and in PATH
- [ ] ✅ Docker is running
- [ ] ✅ `.env` file exists in root with all required variables
- [ ] ✅ `HELIUS_API_KEY` is set (if using Helius features)
- [ ] ✅ `DATABASE_URL` points to running PostgreSQL
- [ ] ✅ `REDIS_URL` or `REDIS_HOST` points to running Redis
- [ ] ✅ `ANCHOR_WALLET` is configured (if using Anchor features)
- [ ] ✅ PostgreSQL container is healthy
- [ ] ✅ Redis container is healthy
- [ ] ✅ Database migrations have been run
- [ ] ✅ All dependencies are installed (`bun install`)

---

## 🚨 Critical Environment Variables

These MUST be set for the application to run:

1. **HELIUS_API_KEY** - Required for transaction analysis
2. **DATABASE_URL** - Required for database operations
3. **SOLANA_NETWORK** - Required (defaults to 'devnet' if not set)
4. **ANCHOR_PROVIDER_URL** - Required for Anchor operations
5. **ANCHOR_WALLET** - Required for Anchor operations (can be JSON or file path)

---

## 📝 Notes

- **Development vs Production**: Use `docker-compose.dev.yml` for development (with volume mounts), `docker-compose.yml` for production
- **Environment Variables**: Root `.env` is loaded by all services. Package-specific `.env` files are optional.
- **Database**: Use `db:push` for quick development, `db:migrate` for production
- **Redis**: Uses Docker service name 'redis' for internal network, 'localhost' for external

---

---

## 🔗 Next Steps After Setup

Once the application is running, see **[RUNTIME_SETUP.md](./RUNTIME_SETUP.md)** for:
- Anchor program deployment
- On-chain registry setup
- Database seeding
- Feature verification
- Runtime maintenance

---

**Last Updated:** December 2025  
**For:** Have I Been Drained? Application

