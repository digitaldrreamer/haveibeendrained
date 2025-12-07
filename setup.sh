#!/bin/bash

# Have I Been Drained - Automated Setup Script
# This script automates the project setup while pausing for interactive prompts

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}\n"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC}  $1"
}

print_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

print_error() {
    echo -e "${RED}✗${NC}  $1"
}

pause_for_user() {
    echo -e "\n${YELLOW}⏸${NC}  $1"
    read -p "Press Enter to continue..."
}

# Check prerequisites
print_step "Checking prerequisites..."

if ! command -v bun &> /dev/null; then
    print_error "Bun is not installed. Please install it first:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
print_success "Bun is installed ($(bun --version))"

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_success "Docker is installed"

if ! command -v anchor &> /dev/null; then
    print_error "Anchor is not installed. Please install it first:"
    echo ""
    echo "  cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.30.1 --locked --force"
    echo ""
    exit 1
fi

# Try to get version, check for GLIBC errors
ANCHOR_CHECK=$(anchor --version 2>&1)
ANCHOR_EXIT_CODE=$?

if [ $ANCHOR_EXIT_CODE -ne 0 ]; then
    print_error "Anchor version check failed!"
    echo ""
    echo "Error output:"
    echo "$ANCHOR_CHECK"
    echo ""
    
    if echo "$ANCHOR_CHECK" | grep -q "GLIBC"; then
        echo "This is a GLIBC compatibility issue."
        echo ""
        echo "Fix by reinstalling Anchor 0.30.1 (compatible with your system):"
        echo ""
        echo "  cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.30.1 --locked --force"
        echo ""
        echo "This will take 5-10 minutes to compile, then run this script again."
    fi
    exit 1
fi

print_success "Anchor is installed ($ANCHOR_CHECK)"

# Start setup
print_step "Starting project setup..."

PROJECT_NAME="haveibeendrained"
CURRENT_DIR=$(pwd)

# Check if we're already in the project directory
if [ "$(basename "$CURRENT_DIR")" = "$PROJECT_NAME" ]; then
    print_info "Already in project directory"
else
    # Create project directory if it doesn't exist
    if [ -d "$PROJECT_NAME" ]; then
        print_error "Directory $PROJECT_NAME already exists!"
        read -p "Do you want to remove it and start fresh? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$PROJECT_NAME"
            print_success "Removed existing directory"
        else
            print_error "Aborting setup"
            exit 1
        fi
    fi
    
    mkdir "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    print_success "Created project directory: $PROJECT_NAME"
fi

# Initialize git
print_step "Initializing Git repository..."
git init
print_success "Git repository initialized"

# Create directory structure
print_step "Creating directory structure..."
mkdir -p packages/{anchor,api,frontend,shared}
mkdir -p scripts .github/workflows
print_success "Directory structure created"

# Create root package.json
print_step "Creating root package.json..."
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
print_success "Root package.json created"

# Create docker-compose.yml
print_step "Creating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
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
print_success "docker-compose.yml created"

# Create .env.example
print_step "Creating .env.example..."
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
PROGRAM_ID=

# API
PORT=3000
NODE_ENV=development
EOF
print_success ".env.example created"

# Copy to .env
if [ ! -f .env ]; then
    cp .env.example .env
    print_success ".env file created (remember to fill in your API keys!)"
else
    print_info ".env file already exists, skipping"
fi

# Create .gitignore
print_step "Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment
.env
.env.local

# Build outputs
dist/
build/
target/
.anchor/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Anchor
test-ledger/
.anchor/

# Bun
.bun/
EOF
print_success ".gitignore created"

# Start Docker services
print_step "Starting Docker services (PostgreSQL + Redis)..."
docker-compose up -d
sleep 5  # Wait for services to be ready
print_success "Docker services started"

# Verify Docker services
print_info "Verifying Docker services..."
if docker-compose ps | grep -q "Up"; then
    print_success "Docker services are running"
else
    print_error "Docker services failed to start. Check with: docker-compose logs"
    exit 1
fi

# Initialize Anchor project
print_step "Initializing Anchor project..."

# Clean up any existing directories from previous runs
if [ -d "drainer-registry" ]; then
    print_info "Cleaning up leftover drainer-registry directory..."
    rm -rf drainer-registry
fi

if [ -d "packages/anchor" ] && [ "$(ls -A packages/anchor 2>/dev/null)" ]; then
    print_info "Cleaning up existing Anchor directory..."
    rm -rf packages/anchor/*
    rm -rf packages/anchor/.*  2>/dev/null || true
fi

print_info "This will create a new Anchor project called 'drainer-registry'"
# Use --no-install to skip yarn (we'll use Bun instead)
anchor init drainer-registry --no-install

# Move Anchor files to packages/anchor
print_info "Moving Anchor project to packages/anchor..."
mv drainer-registry/* packages/anchor/ 2>/dev/null || true
mv drainer-registry/.* packages/anchor/ 2>/dev/null || true
rmdir drainer-registry

# Install Anchor dependencies with Bun
print_info "Installing Anchor dependencies with Bun..."
cd packages/anchor
bun install
cd ../..

print_success "Anchor project initialized in packages/anchor"

# Set up Hono API
print_step "Setting up Hono API..."
cd packages

print_info "INTERACTIVE: You'll be prompted to set up the Hono project"
print_info "  1. Choose 'bun' as the template"
print_info "  2. Install dependencies: Yes"
pause_for_user "Ready to run 'bun create hono api'?"

bun create hono api

cd api

print_info "Installing additional dependencies for the API..."
bun add @hono/zod-validator zod
bun add drizzle-orm postgres
bun add @hono-rate-limiter/redis hono-rate-limiter redis
bun add @solana/web3.js @coral-xyz/anchor
bun add -d drizzle-kit @types/node

print_success "API dependencies installed"

# Update API package.json
print_info "Updating API package.json scripts..."
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
    "@hono/zod-validator": "^0.7.0",
    "zod": "^4.0.0",
    "drizzle-orm": "^0.45.0",
    "postgres": "^3.4.0",
    "@hono-rate-limiter/redis": "^0.1.4",
    "hono-rate-limiter": "^0.4.2",
    "redis": "^5.10.0",
    "@solana/web3.js": "^1.95.0",
    "@coral-xyz/anchor": "^0.32.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "^20.0.0",
    "drizzle-kit": "^0.24.0",
    "typescript": "^5.3.0"
  }
}
EOF

bun install
print_success "API package.json updated"

cd ../..  # Back to root

# Set up Frontend
print_step "Setting up Astro frontend..."
cd packages/frontend

print_info "INTERACTIVE: You'll be prompted to set up the Astro project"
print_info "  1. Choose 'Empty' template"
print_info "  2. Install dependencies: Yes"
print_info "  3. TypeScript: Yes (strict)"
print_info "  4. Git: No (already initialized)"
pause_for_user "Ready to run 'bun create astro@latest .'?"

bun create astro@latest .

print_info "Installing additional frontend dependencies..."
bun add @astrojs/svelte svelte
bun add -d tailwindcss @tailwindcss/typography

print_success "Frontend setup complete"

cd ../..  # Back to root

# Set up Shared package
print_step "Setting up shared package..."
cd packages/shared

bun init -y

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

mkdir -p src/{types,constants}
touch src/index.ts src/types/index.ts src/constants/index.ts

print_success "Shared package setup complete"

cd ../..  # Back to root

# Install root dependencies
print_step "Installing root dependencies..."
bun install
print_success "Root dependencies installed"

# Create README
print_step "Creating README.md..."
cat > README.md << 'EOF'
# Have I Been Drained 🛡️

> First decentralized wallet security checker on Solana

## Quick Start

```bash
# Start Docker services
docker-compose up -d

# Install dependencies
bun install

# Start API dev server
bun run api:dev

# Start frontend dev server (in another terminal)
bun run frontend:dev

# Build Anchor program
bun run anchor:build
```

## Project Structure

- `packages/anchor/` - Solana program (Anchor)
- `packages/api/` - Backend API (Hono + Drizzle)
- `packages/frontend/` - Frontend (Astro + Svelte)
- `packages/shared/` - Shared types and constants

## Documentation

- [Setup Guide](./SETUP_GUIDE.md)
- [Hackathon Plan](./HACKATHON_PLAN.md)

## License

MIT
EOF
print_success "README.md created"

# Initial git commit
print_step "Creating initial git commit..."
git add .
git commit -m "Initial project setup

- Bun monorepo with workspaces
- Anchor program structure
- Hono API with Drizzle ORM
- Astro + Svelte frontend
- Docker Compose for PostgreSQL + Redis"
print_success "Initial commit created"

# Final summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  ✓ Project setup complete!                                 ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
print_info "Next steps:"
echo "  1. Fill in your API keys in .env file"
echo "  2. Set up database: cd packages/api && bun run db:generate && bun run db:migrate"
echo "  3. Start development:"
echo "     - Terminal 1: bun run api:dev"
echo "     - Terminal 2: bun run frontend:dev"
echo ""
print_info "Useful commands:"
echo "  - View Docker logs: docker-compose logs -f"
echo "  - Stop Docker: docker-compose down"
echo "  - Database studio: bun run db:studio"
echo ""
print_success "Happy hacking! 🚀"
