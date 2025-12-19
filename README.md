# Have I Been Drained? 🔒

**First decentralized, community-powered wallet security checker on Solana**

[![Solana](https://img.shields.io/badge/Solana-3E5FFF?style=flat&logo=solana&logoColor=white)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.32.1-3E5FFF?style=flat)](https://www.anchor-lang.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Built for Solana Student Hackathon Fall 2025**

## 🎯 The Problem

In 2024-2025, Solana wallet drainers stole **$300+ million** from **324,000+ users**. Current security solutions are:
- ❌ **Centralized** - Single points of failure
- ❌ **Slow** - Delayed threat detection
- ❌ **Incomplete** - Missing many attack patterns
- ❌ **Not community-driven** - No way for users to contribute

## ✨ The Solution

**Have I Been Drained?** is the first decentralized, on-chain drainer registry that:

- ✅ **On-Chain Registry** - Immutable, permissionless drainer reports via Anchor program
- ✅ **Real-Time Analysis** - Instant wallet security scanning using Helius RPC
- ✅ **Multi-Pattern Detection** - Detects SetAuthority, unlimited approvals, and known drainers
- ✅ **Community-Powered** - Anyone can report drainers (with anti-spam protection)
- ✅ **Solana Actions (Blinks)** - Check wallets directly from Twitter/Discord

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   API Server    │───▶│  Helius RPC     │
│   (Astro +      │    │   (Hono + Bun)  │    │  (Transaction   │
│    Svelte)      │    │                 │    │   Analysis)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Solana Actions │    │  Anchor Program │
│  (Blinks)       │    │  (On-Chain      │
│                 │    │   Registry)     │
└─────────────────┘    └─────────────────┘
```

### Key Components

1. **Anchor Program** (`packages/anchor/`)
   - On-chain drainer registry using PDAs
   - 0.01 SOL anti-spam fee per report
   - Immutable, verifiable reports

2. **API Server** (`packages/api/`)
   - Transaction analysis via Helius RPC
   - Pattern detection (SetAuthority, approvals, known drainers)
   - Risk aggregation and recommendations
   - Anchor program integration

3. **Frontend** (`packages/frontend/`)
   - Modern UI with Tailwind CSS
   - Real-time wallet analysis
   - Risk visualization and recommendations

4. **Shared Package** (`packages/shared/`)
   - TypeScript types and utilities
   - Anchor IDL and constants
   - API client and validation

5. **Documentation** (`docs/`)
   - Comprehensive safety education articles
   - Story-driven security awareness content
   - Interlinked articles for better navigation
   - Mintlify-powered documentation site

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) (v1.2+)
- [Docker](https://www.docker.com/) and Docker Compose
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (for Anchor)
- [Anchor](https://www.anchor-lang.com/) (v0.32.1+)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/digitaldrreamer/haveibeendrained.git
   cd haveibeendrained
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example files
   cp .env.example .env
   cp packages/api/.env.example packages/api/.env
   cp packages/frontend/.env.example packages/frontend/.env
   
   # Edit .env files with your values:
   # - HELIUS_API_KEY (get from https://helius.dev)
   # - ANCHOR_WALLET (path to your keypair)
   ```

4. **Start services with Docker Compose**
   ```bash
   docker compose up -d
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - API Health: http://localhost:3001/api/health

## 📖 Usage

### Analyze a Wallet

1. Open http://localhost:3000
2. Enter a Solana wallet address
3. View the security analysis:
   - Risk score (0-100)
   - Detected threats
   - Affected assets
   - Recovery recommendations

### Report a Drainer

**Via API:**
```bash
curl -X POST http://localhost:3001/api/report \
  -H "Content-Type: application/json" \
  -d '{
    "drainerAddress": "DRAINER_ADDRESS",
    "amountStolen": 1.5
  }'
```

**Query Reports:**
```bash
curl http://localhost:3001/api/report/DRAINER_ADDRESS
```

## 🧪 Testing

### Run All Tests
```bash
bun test
```

### Test Individual Packages
```bash
# Shared utilities
cd packages/shared && bun test

# API services
cd packages/api && bun test

# Anchor program
cd packages/anchor && anchor test
```

## 🏛️ On-Chain Registry

The Anchor program creates a **decentralized drainer registry** on Solana:

- **PDA-based accounts** - One account per drainer address
- **Anti-spam protection** - 0.01 SOL fee per report
- **Immutable records** - All reports are on-chain and verifiable
- **Community-driven** - Anyone can submit reports

**Program ID (Devnet):** `BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2`

## 🔍 Detection Patterns

Our detection engine identifies:

1. **SetAuthority Attacks** (CRITICAL)
   - Account ownership transfers
   - 95% confidence

2. **Unlimited Approvals** (HIGH)
   - Max uint64 token approvals
   - 90% confidence

3. **Known Drainers** (CRITICAL)
   - Addresses in on-chain registry
   - 100% confidence

## 🛠️ Development

### Project Structure

```
haveibeendrained/
├── packages/
│   ├── anchor/          # Anchor program (Rust)
│   ├── api/             # API server (TypeScript + Hono)
│   ├── frontend/        # Frontend (Astro + Svelte)
│   └── shared/          # Shared types and utilities
├── docker-compose.yml   # Local development stack
└── README.md
```

### Development Workflow

1. **Start infrastructure**
   ```bash
   docker compose up -d
   ```

2. **Run API in watch mode**
   ```bash
   cd packages/api && bun run dev
   ```

3. **Run frontend in watch mode**
   ```bash
   cd packages/frontend && bun run dev
   ```

4. **Build Anchor program**
   ```bash
   cd packages/anchor && anchor build
   ```

## 📦 Deployment

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for production deployment guide.

### Quick Deploy

**Frontend (Vercel):**
```bash
cd packages/frontend
vercel deploy
```

**API (VPS/Docker):**
```bash
docker compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

This project was built for the Solana Student Hackathon. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **Solana Foundation** - For the amazing ecosystem
- **Helius** - For reliable RPC infrastructure
- **Anchor Team** - For the excellent framework
- **Solana Community** - For inspiration and support

## 📚 Documentation

### Safety Education

Comprehensive, story-driven education to protect yourself from crypto scams and hacks:

- **40+ Real-World Stories** - Learn from actual victims' experiences
- **4 Threat Categories** - Hacks, Frauds, Blackmail, Privacy & Tracking
- **Interlinked Articles** - Seamless navigation between related topics
- **Actionable Prevention** - Clear steps to protect yourself
- **Damage Control Guides** - What to do if you've been affected

**Access:** [Safety Education Documentation](https://docs.haveibeendrained.org/safety-education)

### Technical Documentation

- **API Reference** - Complete API documentation with examples
- **User Guide** - How to check wallets and report drainers
- **Developer Guide** - Integration guides and best practices

**Access:** [Full Documentation](https://docs.haveibeendrained.org)

## 🔗 Links

- **Live Demo:** [Coming Soon]
- **Documentation:** [docs.haveibeendrained.org](https://docs.haveibeendrained.org)
- **Safety Education:** [docs.haveibeendrained.org/safety-education](https://docs.haveibeendrained.org/safety-education)
- **Program Explorer:** [Devnet](https://explorer.solana.com/address/BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2?cluster=devnet)
- **Hackathon Submission:** [Coming Soon]

---

**Built with ❤️ for Solana Student Hackathon Fall 2025**

