---
name: add-feature-flag
description: Use when adding or toggling a boolean feature flag in sc-downloader to hide a work-in-progress UI area
---

# Add Feature Flag (sc-downloader)

## Overview

Feature flags in this project are **boolean, runtime, loaded from app data**. They exist to hide in-progress UI from users without deleting the code. The flag system lives at:

- Default template: `src-tauri/feature-flags.toml` (embedded via `include_str!` at compile time)
- Rust reader: `src-tauri/src/commands/settings.rs` (`get_feature_flags` command)
- Frontend types + parser + loader: `src/lib/featureFlags.ts`

On first launch, the Rust backend seeds `<app_data_dir>/feature-flags.toml` from the default template. On subsequent launches, any new flags added to the template are automatically appended to the user's file. Power users can edit this file and restart the app to enable WIP features.

**Core principle: flag the entry point, not the destination.** If the user can't click to reach a piece of UI, you don't need to guard anything behind it.

## When to Use

- Hiding a half-finished settings tab, sidebar entry, menu item, button, or route
- Shipping a build that includes WIP code but shouldn't expose it to users

**Do NOT use flags for:**
- Runtime personalization — use settings store / auth state
- Backend authorization — flags are visibility, not permission
- Rust-side gating — keep Tauri commands registered even if the UI is hidden; unused ≠ unsafe
- Anything the user doesn't interact with directly

## Do Not Write Tests for Feature Flags

No tests for the parser. No tests for flag values. No "flag on / flag off" UI test cases.

If an existing component test renders code that reads the flag, mock it with a single constant so the test is stable:

```ts
vi.mock('@/lib/featureFlags', () => ({
  featureFlags: { rekordbox: true },
}));
```

That is the only acceptable interaction between tests and flags.

## How to Add a New Flag

1. **Add to the default template** — `src-tauri/feature-flags.toml`:
   ```toml
   # <one-line comment: what this gates and why it's off>
   myFeature = false
   ```
   This file is embedded in the binary at compile time. On first launch it's copied to `<app_data_dir>/feature-flags.toml`. For existing users, new keys are automatically appended to their file on next launch.

2. **Add to the frontend typed defaults** — `src/lib/featureFlags.ts`
   ```ts
   export type FeatureFlags = {
     rekordbox: boolean;
     myFeature: boolean;
   };

   const DEFAULTS: FeatureFlags = {
     rekordbox: false,
     myFeature: false,
   };
   ```

3. **Apply it at the entry point only** (see below). Stop there.

4. **Do not write a test.**

## Where to Place the Check — Trace the User's Path

Before adding an `if (flag)`, trace how the user reaches the feature:

```
User → Nav/Sidebar → Detail panel → Action button → Result screen
```

Flag the **first node**. Everything after it becomes unreachable by the UI tree.

### Real example from this repo: hiding the Rekordbox settings tab

User path: `App → Settings → sidebar tab "Rekordbox" → RekordboxSettings panel`

- ✅ **Right:** filter `CATEGORIES` in `SettingsSidebar.tsx` so `'rekordbox'` isn't in the list.
- ❌ **Wrong:** *also* add a redirect `useEffect` in `SettingsDialog.tsx` that resets `selectedCategory = 'general'` if it becomes `'rekordbox'`. Nothing in the UI can put `'rekordbox'` into that state once the tab is hidden — the guard is dead code.
- ❌ **Wrong:** *also* guard `CONTENT_COMPONENTS.rekordbox` or the `RekordboxSettings` panel itself.

## Core Pattern

### Before — overflagging

```tsx
// SettingsSidebar.tsx — correct entry-point check
const visibleCategories = useMemo(
  () => CATEGORIES.filter((c) => c.id !== 'rekordbox' || featureFlags.rekordbox),
  []
);

// SettingsDialog.tsx — UNNECESSARY; no UI can set 'rekordbox' anymore
useEffect(() => {
  if (!featureFlags.rekordbox && selectedCategory === 'rekordbox') {
    setSelectedCategory('general');
  }
}, [selectedCategory]);

// SettingsDialog.tsx — UNNECESSARY; panel is never rendered
const Panel = featureFlags.rekordbox ? RekordboxSettings : null;
```

### After — one check at the entry

```tsx
// SettingsSidebar.tsx — the only flag reference needed
const visibleCategories = useMemo(
  () => CATEGORIES.filter((c) => c.id !== 'rekordbox' || featureFlags.rekordbox),
  []
);
```

## Decision Heuristic

For every `if (flag)` you're tempted to add, ask:

> **"If I remove this check, what does the user see or do differently?"**

- *"Nothing, they can't get here"* → delete the check.
- *"They reach/see the feature"* → this is the entry point, keep the check.

There should be exactly one place where the answer is the second one.

## Quick Reference

| Situation | Where the flag goes |
|-----------|---------------------|
| Settings sidebar tab | `CATEGORIES` filter in `SettingsSidebar.tsx` |
| Button that opens a WIP dialog | The button's render, not the dialog |
| Menu item in a dropdown | The `<DropdownMenuItem>` render |
| New route | Route registration in `App.tsx`, not the page |
| Panel rendered by an already-flagged tab | **Nothing — unreachable by construction** |
| Rust command only called from flagged UI | **Nothing — leave it registered** |

## Red Flags — You're Overflagging

- A second `if (featureFlags.x)` in code the first check already makes unreachable
- "What if the state somehow becomes X" defensive redirects or fallbacks
- A flag check inside a component whose parent already checks the flag
- Importing `featureFlags` into more than ~2 files for a single feature
- Gating a `RekordboxSettings` / `CONTENT_COMPONENTS` / route component whose only entry point is already hidden

**All of these mean: delete the extra checks. One flag at the entry is enough.**

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Flagging both the sidebar and `selectedCategory` redirect effect | Sidebar only; unreachable state can't be reached |
| Flagging the panel component in `CONTENT_COMPONENTS` | Leave it |
| Writing "defensive" redirects for categories no UI exposes | Delete them |
| Adding a `*.test.ts` file for the flag | Don't — see "Do Not Write Tests" |
| Gating Rust/Tauri commands the frontend won't call | Leave them registered |
| Adding a flag without updating `FeatureFlags` type + `DEFAULTS` | Parser throws "unknown flag" at startup |
| Adding a flag to frontend `DEFAULTS` but not to `src-tauri/feature-flags.toml` | New installs won't have the key in their file (harmless but inconsistent) |

## Checklist

1. Add the flag + default to `FeatureFlags` type and `DEFAULTS` in `src/lib/featureFlags.ts`.
2. Add the flag + default to `src-tauri/feature-flags.toml` with a one-line comment on what it gates.
3. Identify the single UI entry point on the user's path.
4. Add the flag check there — and only there.
5. Do **not** write a test.
