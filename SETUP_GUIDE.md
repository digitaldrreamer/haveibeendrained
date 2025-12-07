# Have I Been Drained - Tech Stack Setup Guide
**Stack:** Bun + Hono + Drizzle ORM + PostgreSQL + Redis | **Updated:** December 2025

---

## 🔑 Services to Sign Up For

### Required Services (Free Tier Sufficient)

#### 1. **Helius RPC** (Transaction Data)
- **URL:** https://www.helius.dev
- **Plan:** Free tier (1M credits/month)
- **What you need:** API key
- **Setup time:** 5 minutes

**Steps:**
1. Sign up with email
2. Create new project
3. Copy API key → Save as `HELIUS_API_KEY`

---

#### 2. **Cloudflare Turnstile** (CAPTCHA)
- **URL:** https://www.cloudflare.com/products/turnstile/
- **Plan:** Free (1M assessments/month)
- **What you need:** Site key + secret key
- **Setup time:** 5 minutes

**Steps:**
1. Sign up for Cloudflare account
2. Go to Turnstile dashboard
3. Add your site (use `localhost` for dev)
4. Copy site key and secret key

---

#### 3. **GitHub** (Code Hosting - Required for Hackathon)
- **URL:** https://github.com
- **Plan:** Free
- **What you need:** Public repository
- **Setup time:** 2 minutes

**Steps:**
1. Create new repository: `haveibeendrained`
2. Make it **PUBLIC** (hackathon requirement)
3. Add MIT license

---

### Self-Hosted Services

#### 4. **PostgreSQL** (Database)
- **Local Dev:** Docker container
- **Production:** Your VPS or managed service

#### 5. **Redis** (Rate Limiting)
- **Local Dev:** Docker container
- **Production:** Your VPS or managed service

---

## 📁 Monorepo Structure (Bun Workspaces)

```
haveibeendrained/
├── packages/
│   ├── anchor/                       # Solana program
│   │   ├── programs/
│   │   │   └── drainer-registry/
│   │   │       ├── src/
│   │   │       │   ├── lib.rs
│   │   │       │   ├── instructions/
│   │   │       │   │   └── report_drainer.rs
│   │   │       │   ├── state/
│   │   │       │   │   └── drainer_report.rs
│   │   │       │   └── errors.rs
│   │   │       └── Cargo.toml
│   │   ├── tests/
│   │   ├── Anchor.toml
│   │   └── package.json
│   │
│   ├── api/                          # Hono backend
│   │   ├── src/
│   │   │   ├── index.ts             # Entry point
│   │   │   ├── routes/
│   │   │   │   ├── check.ts
│   │   │   │   ├── drainers.ts
│   │   │   │   ├── report.ts
│   │   │   │   └── actions/         # Solana Actions
│   │   │   │       ├── check.ts
│   │   │   │       └── donate.ts
│   │   │   ├── services/
│   │   │   │   ├── helius.ts
│   │   │   │   ├── detector.ts
│   │   │   │   └── anchor-client.ts
│   │   │   ├── middleware/
│   │   │   │   ├── rate-limit.ts
│   │   │   │   └── cors.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.ts        # Drizzle schema
│   │   │   │   ├── index.ts         # DB client
│   │   │   │   └── migrations/
│   │   │   └── types/
│   │   │       └── index.ts
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── frontend/                     # Astro + Svelte
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── index.astro
│   │   │   │   └── check.astro
│   │   │   ├── components/
│   │   │   │   ├── WalletInput.svelte
│   │   │   │   └── ResultCard.svelte
│   │   │   ├── layouts/
│   │   │   │   └── Layout.astro
│   │   │   └── styles/
│   │   │       └── global.css
│   │   ├── astro.config.mjs
│   │   ├── tailwind.config.cjs
│   │   └── package.json
│   │
│   └── shared/                       # Shared types
│       ├── src/
│       │   ├── types/
│       │   │   ├── drainer.ts
│       │   │   ├── detection.ts
│       │   │   └── api.ts
│       │   └── constants/
│       │       └── programs.ts
│       └── package.json
│
├── scripts/
│   ├── seed-drainers.ts
│   └── setup-db.ts
│
├── docker-compose.yml                # PostgreSQL + Redis
├── .env.example
├── .gitignore
├── package.json                      # Root workspace config
├── bunfig.toml                       # Bun configuration
├── README.md
└── LICENSE
```

---

## 🚀 Initial Setup (Step-by-Step)

### 1. Install Bun

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

---

### 2. Create Project Structure

```bash
# Create project directory
mkdir haveibeendrained
cd haveibeendrained

# Initialize git
git init
git remote add origin https://github.com/yourusername/haveibeendrained.git

# Create directory structure
mkdir -p packages/{anchor,api,frontend,shared}
mkdir -p scripts .github/workflows

# Create root package.json
cat > package.json << 'EOF'
{
  "name": "haveibeendrained",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "build": "bun run --filter '*' build",
    "test": "bun test",
    "anchor:build": "cd packages/anchor && anchor build",
    "api:dev": "cd packages/api && bun run dev",
    "frontend:dev": "cd packages/frontend && bun run dev",
    "db:generate": "cd packages/api && bun run db:generate",
    "db:migrate": "cd packages/api && bun run db:migrate",
    "db:studio": "cd packages/api && bun run db:studio"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.3.0"
  }
}
EOF
```

---

### 3. Set Up Docker Services (PostgreSQL + Redis)

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: haveibeendrained-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: haveibeendrained
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: haveibeendrained-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
EOF

# Start services
docker-compose up -d

# Verify services are running
docker-compose ps
```

---

### 4. Initialize Anchor Project

```bash
# Anchor init creates a NEW directory, so we init outside packages/
anchor init drainer-registry

# Move the created project into packages/anchor/
mv drainer-registry/* packages/anchor/
mv drainer-registry/.* packages/anchor/ 2>/dev/null || true
rmdir drainer-registry

# Verify structure
ls packages/anchor/
# Should see: Anchor.toml, Cargo.toml, programs/, tests/, etc.
```

---

### 5. Set Up API (Hono + Drizzle)

```bash
# Use official Hono starter (creates in current directory)
cd packages
bun create hono api

cd api

# Install additional dependencies for our project
bun add @hono/zod-validator zod
bun add drizzle-orm postgres
bun add @hono-rate-limiter/redis hono-rate-limiter redis
bun add @solana/web3.js @coral-xyz/anchor

# Install dev dependencies
bun add -d drizzle-kit @types/node

# Update package.json scripts
cat > package.json << 'EOF'
{
  "name": "@haveibeendrained/api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build src/index.ts --outdir=dist --target=bun",
    "start": "bun run dist/index.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/zod-validator": "^0.2.0",
    "zod": "^3.22.0",
    "drizzle-orm": "^0.33.0",
    "postgres": "^3.4.0",
    "@hono-rate-limiter/redis": "^0.3.0",
    "hono-rate-limiter": "^0.3.0",
    "redis": "^4.6.0",
    "@solana/web3.js": "^1.95.0",
    "@coral-xyz/anchor": "^0.30.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "^20.0.0",
    "drizzle-kit": "^0.24.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
EOF

bun install

cd ../..
```

---

### 6. Set Up Frontend (Astro + Svelte)

```bash
cd packages/frontend

# Create Astro project
bun create astro@latest . -- --template minimal --yes

# Install dependencies
bun add @astrojs/svelte svelte
bun add -d tailwindcss @tailwindcss/typography

# Initialize Tailwind
bunx tailwindcss init

cd ../..
```

---

### 7. Set Up Shared Package

```bash
cd packages/shared

bun init -y

# Update package.json
cat > package.json << 'EOF'
{
  "name": "@haveibeendrained/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./constants": "./src/constants/index.ts"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.3.0"
  }
}
EOF

# Create directory structure
mkdir -p src/{types,constants}

cd ../..
```

---

## 📝 Configuration Files

### 1. Environment Variables (`.env.example`)

```bash
cat > .env.example << 'EOF'
# Helius RPC
HELIUS_API_KEY=your_helius_api_key_here

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/haveibeendrained

# Redis
REDIS_URL=redis://localhost:6379

# Cloudflare Turnstile
TURNSTILE_SITE_KEY=your_site_key_here
TURNSTILE_SECRET_KEY=your_secret_key_here

# Anchor
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json
PROGRAM_ID=  # Fill after deployment

# API
PORT=3000
NODE_ENV=development
EOF

# Create actual .env file
cp .env.example .env
```

---

### 2. Drizzle Configuration (`packages/api/drizzle.config.ts`)

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

---

### 3. Database Schema (`packages/api/src/db/schema.ts`)

```typescript
import { pgTable, varchar, integer, timestamp, boolean, decimal, text, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Drainer addresses table
export const drainerAddresses = pgTable('drainer_addresses', {
  address: varchar('address', { length: 44 }).primaryKey(),
  reportCount: integer('report_count').default(1).notNull(),
  firstSeen: timestamp('first_seen').defaultNow().notNull(),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
  riskScore: integer('risk_score').notNull(), // 0-100
  source: varchar('source', { length: 50 }).notNull(), // 'chainabuse', 'onchain', 'community'
  attackType: varchar('attack_type', { length: 50 }), // 'PHISHING', 'ICE_PHISHING', etc.
  estimatedVictims: integer('estimated_victims').default(0),
  estimatedStolenUsd: decimal('estimated_stolen_usd', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  riskScoreIdx: index('risk_score_idx').on(table.riskScore),
  sourceIdx: index('source_idx').on(table.source),
}));

// Analysis cache table
export const analysisCache = pgTable('analysis_cache', {
  walletAddress: varchar('wallet_address', { length: 44 }).primaryKey(),
  result: text('result').notNull(), // JSON string
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  expiresAtIdx: index('expires_at_idx').on(table.expiresAt),
}));

// Community reports table
export const communityReports = pgTable('community_reports', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  reporterAddress: varchar('reporter_address', { length: 44 }),
  drainerAddress: varchar('drainer_address', { length: 44 }).notNull(),
  reportType: varchar('report_type', { length: 50 }).notNull(),
  description: text('description'),
  transactionHash: varchar('transaction_hash', { length: 88 }),
  amountStolenUsd: decimal('amount_stolen_usd', { precision: 15, scale: 2 }),
  verified: boolean('verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Zod schemas for validation
export const insertDrainerAddressSchema = createInsertSchema(drainerAddresses);
export const selectDrainerAddressSchema = createSelectSchema(drainerAddresses);

export const insertAnalysisCacheSchema = createInsertSchema(analysisCache);
export const selectAnalysisCacheSchema = createSelectSchema(analysisCache);

export const insertCommunityReportSchema = createInsertSchema(communityReports);
export const selectCommunityReportSchema = createSelectSchema(communityReports);
```

---

### 4. Database Client (`packages/api/src/db/index.ts`)

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

// Create Drizzle instance
export const db = drizzle(client, { schema });

// Export schema
export * from './schema';
```

---

### 5. Hono Server (`packages/api/src/index.ts`)

```typescript
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import { RedisStore } from '@hono-rate-limiter/redis';
import { createClient } from 'redis';

// Import routes
import checkRoute from './routes/check';
import drainersRoute from './routes/drainers';
import reportRoute from './routes/report';

// Create Redis client for rate limiting
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});
await redisClient.connect();

// Create rate limiter
const limiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // 30 requests per minute
  standardHeaders: 'draft-7',
  keyGenerator: (c) => {
    // Use IP address or API key
    return c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'anonymous';
  },
  store: new RedisStore({ client: redisClient }),
});

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());
app.use('/api/*', limiter);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.route('/api/check', checkRoute);
app.route('/api/drainers', drainersRoute);
app.route('/api/report', reportRoute);

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// Export for Bun
export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};

console.log(`🔥 Server running on port ${process.env.PORT || 3000}`);
```

---

## 🗄️ Database Setup

```bash
# Generate migrations
cd packages/api
bun run db:generate

# Run migrations
bun run db:migrate

# (Optional) Open Drizzle Studio to view database
bun run db:studio
```

---

## ✅ Verification Checklist

### Day 1 Setup Complete When:

- [ ] All services signed up (Helius, Turnstile, GitHub)
- [ ] Docker containers running (PostgreSQL, Redis)
- [ ] Bun workspaces initialized
- [ ] All packages have `package.json`
- [ ] Dependencies installed (`bun install` in root)
- [ ] Database schema created and migrated
- [ ] `.env` file configured with API keys
- [ ] Hono server starts (`cd packages/api && bun run dev`)
- [ ] Astro frontend starts (`cd packages/frontend && bun run dev`)
- [ ] Code pushed to GitHub

---

## 🚀 Quick Start Commands

```bash
# Start all services
docker-compose up -d

# Install dependencies
bun install

# Generate database migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Start API dev server
bun run api:dev

# Start frontend dev server (in another terminal)
bun run frontend:dev

# Build Anchor program
bun run anchor:build
```

---

## 📚 Next Steps

After setup is complete:

1. **Day 1-3:** Implement Anchor program
2. **Day 4-5:** Build detection engine
3. **Day 6-7:** Create frontend + Blinks
4. **Day 8-9:** Integration testing
5. **Day 10-11:** Demo video + documentation
6. **Day 12:** Final deployment

---

**Setup Time:** ~2 hours  
**Last Updated:** December 7, 2025  
**Stack Version:** Bun 1.x + Hono 4.x + Drizzle 0.33.x
