# @haveibeendrained/api

**API Server for Have I Been Drained - Solana Wallet Security Checker**

A high-performance API server built with Hono and Bun, providing wallet security analysis, drainer detection, and Solana Actions (Blinks) integration.

## 🚀 Features

- **Public API** - Rate-limited, cached wallet security checks
- **Solana Actions (Blinks)** - Twitter/Discord integration endpoints
- **Internal API** - Admin endpoints for drainer management
- **API Key Management** - User registration and key management
- **OpenAPI Specification** - Full API documentation
- **Rate Limiting** - Redis-based rate limiting with tiered access
- **Caching** - Redis caching for improved performance
- **Database Integration** - PostgreSQL with Drizzle ORM
- **CORS Support** - Configurable CORS for cross-origin requests
- **Email Notifications** - API key regeneration notifications

## 📦 Installation

```bash
# From root directory
bun install

# Or from this directory
cd packages/api
bun install
```

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Required
HELIUS_API_KEY=your_helius_api_key
ANCHOR_WALLET=~/.config/solana/id.json
SOLANA_NETWORK=devnet  # or mainnet

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/haveibeendrained

# Redis
REDIS_URL=redis://localhost:6379

# API Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Email (optional, for API key notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
```

## 🏃 Running

### Development

```bash
bun run dev
```

Server runs on `http://localhost:3001`

### Production

```bash
bun run build
bun run start
```

## 📚 API Endpoints

### Public API (`/api/v1`)

#### `GET /api/v1/check`
Unified endpoint for checking drainer addresses and wallet security.

**Query Parameters:**
- `address` (required) - Solana wallet address (32-44 chars)
- `limit` (optional) - Transaction limit for analysis (1-200, default: 50)
- `experimental` (optional) - Include experimental detections (default: false)

**Rate Limits:**
- Unregistered: 10 requests/hour
- Registered: 100 requests/hour
- Enterprise: 1000 requests/hour

**Example:**
```bash
curl "http://localhost:3001/api/v1/check?address=ABC123...&limit=50"
```

#### `GET /api/v1/drainer/:address`
Check if an address is a known drainer.

**Example:**
```bash
curl "http://localhost:3001/api/v1/drainer/ABC123..."
```

#### `GET /api/v1/analyze`
Perform full wallet security analysis.

**Query Parameters:**
- `address` (required) - Solana wallet address
- `limit` (optional) - Transaction limit (1-200)
- `experimental` (optional) - Include experimental detections

**Example:**
```bash
curl "http://localhost:3001/api/v1/analyze?address=ABC123..."
```

### Solana Actions (`/api/actions`)

#### `GET /api/actions/check`
Solana Actions endpoint for checking wallet security (v2.4.2 spec).

**Query Parameters:**
- `address` - Solana wallet address

**Headers:**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

#### `POST /api/actions/report`
Solana Actions endpoint for reporting drainers.

**Body:**
```json
{
  "drainerAddress": "ABC123...",
  "amountStolen": 1.5
}
```

### Internal API (`/api/internal`)

#### `POST /api/internal/report`
Report a drainer address (requires authentication).

#### `GET /api/internal/report/:address`
Get drainer report details.

### API Keys (`/api/keys`)

#### `POST /api/keys/register`
Register for an API key.

**Body:**
```json
{
  "email": "user@example.com",
  "name": "Your Name"
}
```

#### `POST /api/keys/regenerate`
Regenerate an API key (requires existing key).

#### `GET /api/keys/status`
Check API key status and usage.

### OpenAPI (`/api/openapi.json`)

Get the OpenAPI 3.0 specification.

```bash
curl "http://localhost:3001/api/openapi.json"
```

## 🗄️ Database

### Setup

```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Push schema (dev only)
bun run db:push

# Open Drizzle Studio
bun run db:studio
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Run E2E tests
bun run test:e2e
```

## 📊 Scripts

### Data Management

```bash
# Populate drainer database
bun run populate:drainers

# Scrape ChainAbuse for drainer addresses
bun run scrape:chainabuse

# Analyze and sync drainers
bun run analyze:sync

# Export OpenAPI spec
bun run export:openapi
```

## 🏗️ Architecture

### Middleware Stack

1. **CORS** - Cross-origin resource sharing
2. **User-Agent Parser** - Parse and validate User-Agent headers
3. **Cache Middleware** - Redis caching for responses
4. **Rate Limiter** - Tiered rate limiting based on API key
5. **Zod Validator** - Request validation

### Services

- **AnchorClient** - Interact with Anchor program
- **WalletAnalysis** - Analyze wallet transactions
- **DrainerDetection** - Detect drainer patterns
- **RiskAggregation** - Aggregate risk scores

### Detection Patterns

1. **SetAuthority Attacks** - Account ownership transfers (95% confidence)
2. **Unlimited Approvals** - Max uint64 token approvals (90% confidence)
3. **Known Drainers** - Addresses in on-chain registry (100% confidence)

## 🔒 Security

- Rate limiting prevents abuse
- API key authentication for registered users
- CORS protection for cross-origin requests
- Input validation with Zod schemas
- SQL injection protection via Drizzle ORM

## 📝 Environment Variables

See `.env.example` for all available configuration options.

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file for details.
