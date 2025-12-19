# How to Get and Populate Known Drainer Addresses

## 🔍 Sources for Known Drainer Addresses

### 1. Chainabuse.com (Primary Source)
**URL:** https://www.chainabuse.com

**How to use:**
1. Go to Chainabuse.com
2. Search for "Solana" or "SOL"
3. Filter by "Drainer" or "Phishing"
4. Copy wallet addresses from reports
5. Verify addresses are valid Solana addresses

**Example search:** "Solana drainer" or "SOL phishing"

---

### 2. Solana Security Twitter Accounts
**Accounts to follow:**
- @SolanaSecurity
- @SlowMist_Team
- @CertiKAlert
- @PeckShieldAlert

**How to use:**
1. Search these accounts for "drainer" or "phishing"
2. Look for wallet addresses in their posts
3. Verify addresses are valid Solana addresses

---

### 3. Solana Forums & Discord
**Places to check:**
- Solana Discord #security channel
- Solana Stack Exchange
- Reddit r/solana (security discussions)

**How to use:**
1. Search for "drainer" or "hacked"
2. Look for transaction signatures or wallet addresses
3. Verify addresses on Solana Explorer

---

### 4. On-Chain Analysis
**How to find drainers on-chain:**

1. **Find drain transaction signatures:**
   - Look for transactions with SetAuthority instructions
   - Look for transactions with large token transfers
   - Check Solana Explorer for suspicious activity

2. **Extract drainer addresses:**
   - Analyze transaction accounts
   - Identify the recipient (drainer)
   - Verify it's not a legitimate DEX or service

3. **Tools:**
   - Solana Explorer: https://explorer.solana.com
   - Solscan: https://solscan.io
   - Your own Helius analysis

---

### 5. Community Reports
**How it works:**
- Users report drainers via your API
- Reports go to on-chain registry
- Addresses become part of the database

**For testing:**
- You can report test addresses yourself
- Use the populate script to batch submit

---

## 📝 How to Populate the Registry

### Method 1: Using the Populate Script

1. **Add addresses to the script:**
   ```bash
   # Edit packages/api/scripts/populate-drainers.ts
   # Add addresses to KNOWN_DRAINER_ADDRESSES array
   ```

2. **Run the script:**
   ```bash
   cd packages/api
   bun run scripts/populate-drainers.ts
   ```

3. **Verify:**
   ```bash
   # Check if address is in registry
   curl http://localhost:3001/api/report/DRAINER_ADDRESS
   ```

### Method 2: Manual API Calls

**Submit a single drainer:**
```bash
curl -X POST http://localhost:3001/api/report \
  -H "Content-Type: application/json" \
  -d '{
    "drainerAddress": "DRAINER_ADDRESS_HERE",
    "amountStolen": 1.5
  }'
```

**Query a drainer:**
```bash
curl http://localhost:3001/api/report/DRAINER_ADDRESS
```

### Method 3: Batch Import from File

Create a JSON file with drainer addresses:

```json
[
  {
    "address": "DrainerAddress1111111111111111111111111111111",
    "amountStolen": 1.5,
    "source": "chainabuse"
  },
  {
    "address": "DrainerAddress2222222222222222222222222222222",
    "amountStolen": 2.3,
    "source": "twitter"
  }
]
```

Then modify the populate script to read from this file.

---

## ⚠️ Important Notes

### For Testing (Devnet)
- You can use any addresses for testing
- Create test drainer addresses yourself
- No real harm done on devnet

### For Production (Mainnet)
- ⚠️ **Only report verified drainer addresses**
- Double-check addresses before reporting
- False reports waste SOL (0.01 SOL fee)
- Verify addresses are actually malicious

### Validation Checklist
Before submitting an address, verify:
- [ ] Address is a valid Solana address (base58, 32-44 chars)
- [ ] Address is actually a drainer (not a legitimate service)
- [ ] You have evidence (transaction, report, etc.)
- [ ] Address is not yourself or system program

---

## 🧪 Testing with Known Drainers

### Step 1: Populate Registry
```bash
# Add test drainer addresses to populate-drainers.ts
# Run the script
bun run scripts/populate-drainers.ts
```

### Step 2: Test Detection
```bash
# Analyze a wallet that interacted with the drainer
curl "http://localhost:3001/api/analyze?address=VICTIM_WALLET_ADDRESS"
```

### Step 3: Verify Results
- Check if "KNOWN_DRAINER" detection appears
- Verify confidence is 100%
- Check recommendations are shown

---

## 📊 Example Workflow

1. **Find drainer address:**
   - Search Chainabuse for "Solana drainer"
   - Copy address: `ABC123...XYZ789`

2. **Validate address:**
   ```bash
   # Check if it's a valid Solana address
   solana address ABC123...XYZ789
   ```

3. **Submit to registry:**
   ```bash
   curl -X POST http://localhost:3001/api/report \
     -H "Content-Type: application/json" \
     -d '{"drainerAddress": "ABC123...XYZ789", "amountStolen": 1.0}'
   ```

4. **Verify it's stored:**
   ```bash
   curl http://localhost:3001/api/report/ABC123...XYZ789
   ```

5. **Test detection:**
   ```bash
   # Analyze a wallet that interacted with this drainer
   curl "http://localhost:3001/api/analyze?address=VICTIM_WALLET"
   ```

---

## 🔗 Quick Links

- **Chainabuse:** https://www.chainabuse.com
- **Solana Explorer:** https://explorer.solana.com
- **Solscan:** https://solscan.io
- **Your API:** http://localhost:3001/api/report

---

## 💡 Pro Tips

1. **Start with a few addresses** - Don't try to populate everything at once
2. **Verify before submitting** - Check addresses are actually drainers
3. **Use devnet for testing** - Test the flow before mainnet
4. **Document sources** - Keep track of where addresses came from
5. **Community reports** - Encourage users to report drainers via your app

---

**Remember:** The on-chain registry is community-powered. The more legitimate reports, the better protection for everyone!


