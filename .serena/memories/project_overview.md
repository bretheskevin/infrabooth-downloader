# SC-Downloader Project Overview

## Purpose
Tauri-based desktop app for downloading audio from SoundCloud. Features OAuth auth, batch downloading, format conversion (FFmpeg), ID3 metadata.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Rust + Tauri 2.x (tokio full, futures, reqwest)
- **State**: Zustand stores
- **Data fetching**: TanStack React Query
- **i18n**: i18next (en, fr)
- **IPC**: tauri-specta → `src/bindings.ts`

## Key Dirs
- `src-tauri/src/services/pipeline.rs` — core download pipeline
- `src-tauri/src/commands/download.rs` — download command
- `src-tauri/src/services/queue.rs` — queue management
- `src/features/` — feature-based frontend modules

## Commands
- `npm run dev` — frontend dev
- `npm run tauri dev` — full Tauri dev
- `npm test` — Vitest
- `npm run typecheck` — TS check
- `cargo check` — Rust check (from src-tauri/)
