---
name: remove-feature-flag
description: Use when removing a boolean feature flag from sc-downloader after the feature is complete and ready to ship
---

# Remove Feature Flag (sc-downloader)

## Overview

When a feature behind a flag is complete and ready to ship unconditionally, remove the flag entirely. This skill is the inverse of `add-feature-flag`.

**Core principle: remove all traces.** Flag type, default, toml entry, every usage in source and tests.

## When to Use

- Feature behind a flag is complete and stable
- Shipping the feature unconditionally to all users
- Cleaning up old flags that no longer serve a purpose

**Do NOT remove if:**
- Feature still needs iteration before full release
- Flag gates experimental code that might be reverted

## Files to Edit

| File | What to remove |
|------|----------------|
| `src-tauri/feature-flags.toml` | The flag line and its comment |
| `src/lib/featureFlags.ts` | Key from `FeatureFlags` type and `DEFAULTS` object |
| Source files | All `if (featureFlags.x)` / filter logic referencing the flag |
| Test files | Any `vi.mock` overrides for that flag |

## How to Remove a Flag

### 1. Find all usages

```bash
grep -r "featureFlags\\.flagName" src/
grep -r "flagName" src-tauri/feature-flags.toml
```

### 2. Remove from toml

In `src-tauri/feature-flags.toml`, delete the flag line and its comment:

```diff
-# Gates the rekordbox export integration
-rekordbox = false
```

### 3. Remove from TypeScript type and defaults

In `src/lib/featureFlags.ts`:

```diff
 export type FeatureFlags = {
-  rekordbox: boolean;
 };

 const DEFAULTS: FeatureFlags = {
-  rekordbox: false,
 };
```

### 4. Remove usage at entry point

Find the single UI entry point check (see `add-feature-flag` skill for patterns) and remove it:

```diff
-const visibleCategories = useMemo(
-  () => CATEGORIES.filter((c) => c.id !== 'rekordbox' || featureFlags.rekordbox),
-  []
-);
+const visibleCategories = CATEGORIES;
```

Or if the flag was a simple conditional render:

```diff
-{featureFlags.rekordbox && <RekordboxTab />}
+<RekordboxTab />
```

### 5. Clean up test mocks

Remove any `vi.mock` overrides:

```diff
-vi.mock('@/lib/featureFlags', () => ({
-  featureFlags: { rekordbox: true },
-}));
```

### 6. Remove unused imports

If `featureFlags` is no longer used in a file after removal, delete the import:

```diff
-import { featureFlags } from '@/lib/featureFlags';
```

## Quick Reference

| What | Command/Location |
|------|------------------|
| Find all usages | `grep -r "featureFlags\.flagName" src/` |
| Toml file | `src-tauri/feature-flags.toml` |
| Type definition | `src/lib/featureFlags.ts` → `FeatureFlags` type |
| Defaults | `src/lib/featureFlags.ts` → `DEFAULTS` object |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Leaving the flag in `DEFAULTS` but removing from type | TypeScript error — remove from both |
| Leaving the flag in toml but removing from TypeScript | Parser ignores unknown keys, but creates inconsistency — remove from toml too |
| Forgetting to remove test mocks | Tests may fail or behave unexpectedly — search for `vi.mock.*featureFlags` |
| Removing flag but leaving dead conditional logic | The feature becomes unconditionally visible but old filter/guard logic remains — simplify the expressions |
| Removing `import { featureFlags }` before removing usages | TypeScript error — remove usages first, then unused imports |

## Checklist

1. Search for all usages: `grep -r "featureFlags\.flagName" src/` and `grep -r "flagName" src-tauri/`
2. Remove from `src-tauri/feature-flags.toml` (line + comment)
3. Remove from `FeatureFlags` type in `src/lib/featureFlags.ts`
4. Remove from `DEFAULTS` in `src/lib/featureFlags.ts`
5. Remove usage at UI entry point — simplify the conditional
6. Remove any test mocks referencing the flag
7. Remove unused `featureFlags` imports
8. Verify no TypeScript errors: `npm run typecheck`
