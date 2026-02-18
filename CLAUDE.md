# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InfraBooth Downloader is a Tauri-based desktop application for downloading audio from SoundCloud. It features OAuth authentication, batch downloading, format conversion via FFmpeg, and ID3 metadata embedding.

**Tech Stack:**
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Rust + Tauri 2.x
- State: Zustand stores (auth, queue, settings)
- Data fetching: TanStack React Query
- i18n: i18next (English, French)
- Type-safe IPC: tauri-specta generates `src/bindings.ts`

## Commands

```bash
# Development
npm run dev              # Start Vite dev server (frontend only)
npm run tauri dev        # Full Tauri dev mode with Rust backend

# Build
npm run build            # Build frontend
npm run tauri build      # Build complete app bundle

# Testing
npm test                 # Run Vitest once
npm run test:watch       # Vitest watch mode

# Type checking
npm run typecheck        # TypeScript check (no emit)
cargo check              # Rust type checking (run from src-tauri/)
```

## Architecture

### Feature-Based Module Organization
Each feature in `src/features/` is self-contained:
```
feature/
├── components/     # UI components
├── hooks/          # Custom React hooks
├── api/            # React Query mutations/queries
├── store.ts        # Zustand state
├── types/          # TypeScript definitions
├── utils/          # Business logic
└── __test__/       # Tests
```

Features: `auth`, `url-input`, `queue`, `progress`, `completion`, `settings`

### Tauri Command Flow
1. Rust commands in `src-tauri/src/commands/` are exported via `#[tauri::command]`
2. tauri-specta generates TypeScript bindings in `src/bindings.ts`
3. Frontend calls commands through type-safe generated functions

### Download Pipeline (`src-tauri/src/services/pipeline.rs`)
1. URL validation → SoundCloud API playlist fetch
2. yt-dlp sidecar downloads audio
3. FFmpeg converts to target format
4. ID3 metadata embedded with id3 crate
5. Progress events streamed to frontend via Tauri events

### Sidecar Binaries
Bundled in `src-tauri/binaries/`:
- yt-dlp (audio download)
- ffmpeg (conversion)
- ffprobe (media inspection)

Platform-specific naming: `yt-dlp-aarch64-apple-darwin`, `ffmpeg-x86_64-pc-windows-msvc.exe`, etc.

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/DownloadPage.tsx` | Main UI orchestrating all features |
| `src-tauri/src/lib.rs` | Tauri setup, command registration, plugins |
| `src-tauri/src/services/pipeline.rs` | Core download pipeline |
| `src-tauri/src/services/oauth.rs` | OAuth PKCE flow |
| `src/bindings.ts` | Auto-generated IPC types (do not edit) |
| `tauri.conf.json` | App config, deep-link scheme, bundling |

## Conventions

- Use existing shadcn/ui components from `src/components/ui/`
- Zustand stores follow pattern: state + actions in single file
- Translations in `src/locales/{en,fr}.json`, use `useTranslation()` hook
- Tests colocated in `__test__/` directories
- Rust errors use custom types in `src-tauri/src/models/error.rs`

## System Requirements

| Platform | Minimum Version |
|----------|-----------------|
| macOS    | 10.15 (Catalina) |
| Windows  | 10 |
