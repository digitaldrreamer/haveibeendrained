# Deployment Checklist 🚀

Complete deployment guide for production environment.

## 📋 Pre-Deployment Checklist

### Environment Variables
- [ ] All `.env` files configured with production values
- [ ] `HELIUS_API_KEY` set (production key)
- [ ] `SOLANA_NETWORK` set (mainnet or devnet)
- [ ] `ANCHOR_WALLET` path configured
- [ ] `DATABASE_URL` configured (production database)
- [ ] `REDIS_URL` configured (production Redis)
- [ ] All secrets stored securely (not in git)

### Code Quality
- [ ] All tests passing (`bun test`)
- [ ] No linter errors
- [ ] Code reviewed
- [ ] README.md updated
- [ ] LICENSE file present

### Anchor Program
- [ ] Program built successfully (`anchor build`)
- [ ] Tests passing (`anchor test`)
- [ ] Program deployed to target network
- [ ] Program ID updated in `.env` and code
- [ ] Program verified on explorer

---

## 🌐 Frontend Deployment (Vercel)

### Prerequisites
- [ ] Vercel account created
- [ ] Vercel CLI installed (`npm i -g vercel`)

### Steps

1. **Configure Vercel Project**
   ```bash
   cd packages/frontend
   vercel login
   vercel link
   ```

2. **Set Environment Variables in Vercel Dashboard**
   - `PUBLIC_API_BASE_URL` - Your production API URL
   - Any other public env vars

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Verify**
   - [ ] Frontend accessible at production URL
   - [ ] API calls working
   - [ ] Tailwind styles loading
   - [ ] No console errors

### Vercel Configuration (`vercel.json`)
```json
{
  "buildCommand": "cd packages/frontend && bun install && bun run build",
  "outputDirectory": "packages/frontend/dist",
  "framework": "astro",
  "env": {
    "PUBLIC_API_BASE_URL": "@api_base_url"
  }
}
```

---

## 🔌 API Deployment

### Option 1: VPS with Docker (Recommended)

#### Prerequisites
- [ ] VPS server (Ubuntu 22.04+)
- [ ] Docker and Docker Compose installed
- [ ] Domain name configured (optional)
- [ ] SSL certificate (Let's Encrypt)

#### Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/haveibeendrained.git
   cd haveibeendrained
   ```

2. **Configure Production Environment**
   ```bash
   # Copy and edit production env files
   cp .env.example .env
   cp packages/api/.env.example packages/api/.env
   
   # Edit with production values
   nano .env
   nano packages/api/.env
   ```

3. **Update docker-compose.yml for Production**
   - Remove development volumes
   - Set proper restart policies
   - Configure health checks
   - Set up reverse proxy (Nginx)

4. **Start Services**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

5. **Set Up Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **SSL Certificate (Let's Encrypt)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

7. **Verify**
   - [ ] API health endpoint responding
   - [ ] Analyze endpoint working
   - [ ] Report endpoints working
   - [ ] CORS configured correctly

### Option 2: Railway/Render/Fly.io

1. **Connect Repository**
   - Link GitHub repo to platform

2. **Configure Build**
   - Root directory: `packages/api`
   - Build command: `bun install && bun run build`
   - Start command: `bun run start`

3. **Set Environment Variables**
   - All required env vars from `.env.example`

4. **Deploy**
   - Push to main branch triggers deployment

---

## 🗄️ Database Deployment

### PostgreSQL Setup

1. **Production Database**
   - [ ] Database created
   - [ ] User and password configured
   - [ ] Connection string in `DATABASE_URL`
   - [ ] Backups configured

2. **Run Migrations** (if using Drizzle)
   ```bash
   cd packages/api
   bun run db:migrate
   ```

3. **Verify Connection**
   ```bash
   docker exec -it haveibeendrained-postgres psql -U postgres -d haveibeendrained
   ```

### Redis Setup

1. **Production Redis**
   - [ ] Redis instance created
   - [ ] Connection string in `REDIS_URL`
   - [ ] Persistence configured (AOF)
   - [ ] Memory limits set

2. **Verify Connection**
   ```bash
   docker exec -it haveibeendrained-redis redis-cli ping
   ```

---

## 🔗 Anchor Program Deployment

### Devnet Deployment (Recommended for Hackathon)

1. **Configure Anchor.toml**
   ```toml
   [programs.devnet]
   drainer_registry = "YOUR_PROGRAM_ID"
   ```

2. **Deploy**
   ```bash
   cd packages/anchor
   anchor deploy --provider.cluster devnet
   ```

3. **Verify**
   - [ ] Program visible on Solana Explorer
   - [ ] Can call instructions
   - [ ] Program ID saved in `.env`

### Mainnet Deployment (Production)

⚠️ **Only deploy to mainnet after thorough testing!**

1. **Switch to Mainnet**
   ```bash
   solana config set --url https://api.mainnet-beta.solana.com
   ```

2. **Fund Wallet**
   ```bash
   # Ensure wallet has SOL for deployment fees
   solana balance
   ```

3. **Update Anchor.toml**
   ```toml
   [programs.mainnet]
   drainer_registry = "YOUR_PROGRAM_ID"
   ```

4. **Deploy**
   ```bash
   anchor deploy --provider.cluster mainnet
   ```

5. **Verify**
   - [ ] Program on mainnet explorer
   - [ ] Test with small transaction first
   - [ ] Monitor for issues

---

## 🔒 Security Checklist

- [ ] All API keys rotated for production
- [ ] Database credentials secure
- [ ] Redis password set (if exposed)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Error messages don't leak sensitive info
- [ ] Wallet private keys never committed
- [ ] `.env` files in `.gitignore`

---

## 📊 Monitoring Setup

- [ ] Health check endpoints configured
- [ ] Logging configured (structured logs)
- [ ] Error tracking (Sentry, etc.)
- [ ] Uptime monitoring
- [ ] Performance monitoring
- [ ] Database monitoring
- [ ] Redis monitoring

---

## 🧪 Post-Deployment Testing

### Frontend
- [ ] Homepage loads
- [ ] Wallet input works
- [ ] Analysis completes successfully
- [ ] Results display correctly
- [ ] Mobile responsive
- [ ] No console errors

### API
- [ ] Health endpoint: `GET /api/health`
- [ ] Analyze endpoint: `GET /api/analyze?address=...`
- [ ] Report query: `GET /api/report/:address`
- [ ] Report submit: `POST /api/report`
- [ ] Error handling works
- [ ] Rate limiting works

### Anchor Integration
- [ ] Can query drainer reports
- [ ] Can submit reports (test with devnet)
- [ ] Known drainer detection works
- [ ] Transaction signatures valid

---

## 🔄 Rollback Plan

If deployment fails:

1. **Frontend (Vercel)**
   ```bash
   vercel rollback
   ```

2. **API (Docker)**
   ```bash
   docker compose down
   git checkout previous-version
   docker compose up -d
   ```

3. **Database**
   - Restore from backup if needed

---

## 📝 Production URLs

After deployment, update these:

- [ ] Frontend URL: `https://yourdomain.com`
- [ ] API URL: `https://api.yourdomain.com`
- [ ] Program Explorer: `https://explorer.solana.com/address/...`
- [ ] GitHub repo: `https://github.com/...`
- [ ] Demo video: `https://youtube.com/...`

---

## ✅ Final Checklist

- [ ] All services running
- [ ] All tests passing
- [ ] Documentation updated
- [ ] README.md has correct URLs
- [ ] Demo video recorded
- [ ] Hackathon submission ready
- [ ] Social media posts prepared

---

**Last Updated:** December 2025  
**For:** Solana Student Hackathon Fall 2025

