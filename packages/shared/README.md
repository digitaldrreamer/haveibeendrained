# @haveibeendrained/shared

**Shared types, utilities, and constants for Have I Been Drained**

A TypeScript package containing shared code used across the API, frontend, and other packages.

## 🚀 Features

- **TypeScript Types** - Shared type definitions
- **Anchor IDL** - Program IDL and types
- **Constants** - Program ID and other constants
- **Utilities** - Address validation, API client
- **API Client** - Type-safe API client

## 📦 Installation

```bash
# From root directory
bun install

# Or from this directory
cd packages/shared
bun install
```

## 📚 Usage

### Import Types

```typescript
import type { DrainerRegistry } from '@haveibeendrained/shared';
```

### Import Constants

```typescript
import { PROGRAM_ID } from '@haveibeendrained/shared/constants';
```

### Import Utilities

```typescript
import { isValidSolanaAddress } from '@haveibeendrained/shared/utils/address';
import { apiClient } from '@haveibeendrained/shared/utils/api-client';
```

### Import IDL

```typescript
import idl from '@haveibeendrained/shared/idl/drainer_registry.json';
```

## 📁 Package Structure

```
packages/shared/
├── src/
│   ├── constants/      # Program ID and constants
│   │   └── index.ts
│   ├── idl/           # Anchor IDL JSON
│   │   └── drainer_registry.json
│   ├── types/         # TypeScript types
│   │   ├── index.ts
│   │   └── drainer_registry.ts
│   ├── utils/         # Utility functions
│   │   ├── address.ts
│   │   └── api-client.ts
│   └── index.ts       # Main exports
└── package.json
```

## 🔧 Exports

### Main Export (`@haveibeendrained/shared`)

```typescript
export { idl } from "./idl/drainer_registry.json";
export type { DrainerRegistry } from "./types/drainer_registry";
export * from "./constants";
export * from "./types";
export * from "./utils/address";
export * from "./utils/api-client";
```

### Subpath Exports

- `@haveibeendrained/shared/types` - Type definitions
- `@haveibeendrained/shared/constants` - Constants
- `@haveibeendrained/shared/utils/address` - Address utilities
- `@haveibeendrained/shared/utils/api-client` - API client
- `@haveibeendrained/shared/idl/drainer_registry.json` - Anchor IDL

## 🛠️ Utilities

### Address Validation

```typescript
import { isValidSolanaAddress } from '@haveibeendrained/shared/utils/address';

const isValid = isValidSolanaAddress('ABC123...');
// Returns: boolean
```

### API Client

```typescript
import { apiClient } from '@haveibeendrained/shared/utils/api-client';

// Check wallet
const result = await apiClient.checkWallet('ABC123...');

// Analyze wallet
const analysis = await apiClient.analyzeWallet('ABC123...');

// Get drainer report
const report = await apiClient.getDrainerReport('ABC123...');
```

## 📝 Types

### DrainerRegistry

Type definitions for the Anchor program:

```typescript
import type { DrainerRegistry } from '@haveibeendrained/shared';

// Program types
type DrainerReport = DrainerRegistry['accounts'][0];
type ReportDrainer = DrainerRegistry['instructions'][0];
```

## 🧪 Testing

```bash
bun test
```

## 📦 Dependencies

- **@solana/web3.js** - Solana Web3 library

## 🔄 Updating IDL

When the Anchor program is updated:

1. Build the Anchor program:
   ```bash
   cd packages/anchor
   anchor build
   ```

2. Copy the IDL:
   ```bash
   cp target/idl/drainer_registry.json packages/shared/src/idl/
   ```

3. Regenerate types (if using a code generator):
   ```bash
   # Add type generation script if needed
   ```

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file for details.
