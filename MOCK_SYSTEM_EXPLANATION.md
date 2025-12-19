# Mock System Explanation

This document explains how the mock/demo system works in this codebase, specifically focusing on mock addresses.

## Overview

The codebase uses a **demo mode** system that provides predefined test data for specific wallet addresses. This allows for demos and testing without requiring real wallet analysis or external API calls.

## Key Components

### 1. Demo Mode Service (`packages/api/src/services/demo-mode.ts`)

The core mock system is implemented in the `demo-mode.ts` file. It provides:

#### Demo Mode Activation
- **Enabled when**: `DEMO_MODE=true` OR `NODE_ENV=development`
- **Function**: `isDemoMode()` checks if demo mode is active

#### Mock Wallet Addresses

The system defines 4 predefined demo wallet addresses:

1. **`11111111111111111111111111111111`** - Safe wallet
   - Risk Score: 0
   - Severity: SAFE
   - No detections
   - Transaction Count: 5

2. **`ATRISK1111111111111111111111111111111`** - At-risk wallet
   - Risk Score: 65
   - Severity: AT_RISK
   - Detection: UNLIMITED_APPROVAL
   - Transaction Count: 12
   - Affected Assets: USDC token, 0.5 SOL

3. **`DRAINED111111111111111111111111111111`** - Drained wallet
   - Risk Score: 95
   - Severity: DRAINED
   - Detections: SET_AUTHORITY + KNOWN_DRAINER
   - Transaction Count: 8
   - Affected Assets: USDC, SOL, NFT

4. **`DRAINER111111111111111111111111111111`** - Known drainer interaction
   - Risk Score: 85
   - Severity: AT_RISK
   - Detection: KNOWN_DRAINER
   - Transaction Count: 15

#### Mock Drainer Addresses

Two addresses are configured as demo drainer addresses:
- `DRAINED111111111111111111111111111111`
- `DRAINER111111111111111111111111111111`

These return mock drainer reports when queried.

#### Key Functions

- **`getDemoWallet(address: string)`**: Returns demo wallet data if address matches a demo wallet
- **`getDemoDrainerReport(address)`**: Returns mock drainer report data for demo drainer addresses
- **`isDemoDrainerAddress(address)`**: Checks if an address is a demo drainer address
- **`demoWalletToRiskReport(demo)`**: Converts demo wallet data to RiskReport format
- **`getAllDemoWalletAddresses()`**: Returns all demo wallet addresses (for testing/reference)

#### Mock Signature Generation

The system includes a `generateMockSignature(seed: string)` function that generates valid-looking base58 transaction signatures (88 characters) for demo transactions.

## Integration Points

### 1. Wallet Analysis (`packages/api/src/services/wallet-analysis.ts`)

The `analyzeWallet()` function checks demo mode **first** before making any external API calls:

```typescript
// Check demo mode first (before any external API calls)
const demoWallet = getDemoWallet(address);
if (demoWallet) {
  return demoWalletToRiskReport(demoWallet);
}
```

This ensures:
- No external API calls are made for demo addresses
- Consistent behavior across all endpoints
- Fast response times for demo addresses

### 2. Anchor Client (`packages/api/src/services/anchor-client.ts`)

The `getDrainerReport()` method checks demo mode before querying on-chain:

```typescript
// Check demo mode first (before any on-chain queries)
const demoReport = getDemoDrainerReport(drainerAddress);
if (demoReport) {
  return demoReport;
}
```

### 3. Report Endpoint (`packages/api/src/routes/report.ts`)

The report submission endpoint prevents submitting reports for demo wallets:

```typescript
// Prevent submitting reports for demo wallets
if (isDemoDrainerAddress(validated.drainerAddress)) {
  return c.json({
    success: false,
    error: 'Cannot submit reports for demo/test wallets',
    timestamp: Date.now(),
  }, 400);
}
```

## Mock Data Structure

### Demo Wallet Structure

```typescript
interface DemoWallet {
  address: string;
  riskScore: number;
  severity: 'SAFE' | 'AT_RISK' | 'DRAINED';
  detections: DetectionResult[];
  recommendations: string[];
  transactionCount: number;
  affectedAssets: {
    tokens: string[];
    nfts: string[];
    sol: number;
  };
}
```

### Demo Drainer Report Structure

```typescript
interface DemoDrainerReport {
  drainerAddress: PublicKey;
  reportCount: number;
  firstSeen: number;
  lastSeen: number;
  totalSolReported: number;
  recentReporters: PublicKey[];
}
```

## Usage in Tests

### API Client Tests (`packages/shared/tests/api-client.test.ts`)

Uses Bun's `mock()` function to mock fetch requests:

```typescript
let fetchMock: ReturnType<typeof mock<...>>;
fetchMock.mockImplementation(async () => new Response(...));
```

### Detector Tests (`packages/api/tests/detector.test.ts`)

Uses mock transaction objects and mock functions:

```typescript
const mockTx: any = { ... };
const mockCheckDrainer = async (address: string) => { ... };
```

## Benefits

1. **No External Dependencies**: Demo mode works without Helius API keys or RPC connections
2. **Fast Responses**: Instant responses for demo addresses
3. **Consistent Data**: Same results every time for demo addresses
4. **Testing**: Easy to test frontend with known data
5. **Demos**: Perfect for presentations and demos
6. **Development**: Works in development without full setup

## How to Use

### Enable Demo Mode

Set environment variable:
```bash
DEMO_MODE=true
```

Or run in development mode (automatically enabled):
```bash
NODE_ENV=development
```

### Test with Demo Addresses

Use any of the predefined demo addresses:
- `11111111111111111111111111111111` - Safe wallet
- `ATRISK1111111111111111111111111111111` - At-risk wallet
- `DRAINED111111111111111111111111111111` - Drained wallet
- `DRAINER111111111111111111111111111111` - Drainer interaction

### Get All Demo Addresses

```typescript
import { getAllDemoWalletAddresses } from './services/demo-mode';
const addresses = getAllDemoWalletAddresses();
```

## Important Notes

1. **No Frontend Indicators**: Demo data is indistinguishable from real data (no special UI indicators)
2. **Early Return**: Demo mode is checked **before** any external API calls
3. **Prevention**: Cannot submit reports for demo drainer addresses
4. **Development Default**: Demo mode is automatically enabled in development
5. **Production**: Must explicitly set `DEMO_MODE=true` in production to enable

## Architecture Flow

```
User Request → analyzeWallet()
    ↓
Check: getDemoWallet(address)
    ↓
If demo wallet found → Return demo data (no API calls)
    ↓
If not demo wallet → Real analysis (Helius API, RPC, etc.)
```

This ensures demo mode is transparent and works seamlessly across all endpoints.

