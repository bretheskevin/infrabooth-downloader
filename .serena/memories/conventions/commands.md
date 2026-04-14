# Development Commands

## Dev
- `npm run dev` — Vite frontend dev server only
- `npm run tauri dev` — Full Tauri dev mode (Rust + frontend)

## Build
- `npm run build` — Frontend build
- `npm run tauri build` — Complete app bundle

## Testing
- `npm test` — Vitest once
- `npm run test:watch` — Vitest watch mode

## Type Checking
- `npm run typecheck` — TypeScript (no emit)
- `cd src-tauri && cargo check` — Rust type checking

## Key Config Files
- `tauri.conf.json` — Tauri app config, bundling, sidecar
- `vite.config.ts` / `vitest.config.ts` — frontend build/test config
- `eslint.config.js` — linting
- `commitlint.config.mjs` — commit message format
- `components.json` — shadcn/ui config
- `BINARY_VERSIONS.md` — sidecar binary versions
