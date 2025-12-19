# Anchor Upgrade Blocked - GLIBC Version Issue

## Issue

Attempted to upgrade Anchor CLI to 0.32.1 to match library version, but blocked by system GLIBC version:

- **Required**: GLIBC 2.39 (for Anchor 0.32.1 binary)
- **Available**: Older version (system doesn't have 2.39)
- **Result**: Anchor 0.32.1 binary cannot run

## Solution: Align Versions to 0.30.1

Since upgrading CLI is blocked, we'll align everything to 0.30.1:

1. ✅ **CLI**: Already 0.30.1 (works)
2. ✅ **Library**: Downgraded to 0.30.1 (in packages/api and packages/anchor)
3. ✅ **IDL Fix Script**: Still needed and correct (fixes missing type field)

## Status

- **CLI Version**: 0.30.1 ✅
- **Library Version**: 0.30.1 ✅ (downgraded from 0.32.1)
- **IDL Structure**: Fixed ✅ (via fix-idl script)

## Next Steps

1. Rebuild program with aligned versions
2. Test Program initialization
3. If still fails, implement manual decoding workaround (Option 2)

---

**Note**: To upgrade to 0.32.1 in the future, need to:
- Upgrade system GLIBC (requires system update or container)
- Or use a Docker container with newer GLIBC
- Or wait for Anchor to provide statically linked binaries



