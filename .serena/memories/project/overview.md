# SC-Downloader — Project Overview

## Purpose
InfraBooth Downloader: Tauri 2.x desktop app for downloading audio from SoundCloud.
Core features: OAuth auth (browser cookie extraction), batch downloads, FFmpeg conversion to MP3 320kbps, ID3 metadata embedding, Rekordbox database integration, built-in audio player with crossfade/HLS, library management, artist following with activity feed, new releases tracking.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Rust (Tauri 2.x, tokio, rquest, id3, rusqlite)
- **State**: Zustand stores (auth, queue, settings, player, search, library, changelog, update, selections, new-tracks, new-releases, artist-profile)
- **Data fetching**: TanStack React Query
- **i18n**: i18next (en, fr)
- **IPC**: tauri-specta → auto-generated `src/bindings.ts`
- **Audio**: HLS.js + Web Audio API with crossfade support

## Target Platforms
- macOS 10.15+ (Catalina), Windows 10+
- Desktop only (no mobile/tablet considerations)

## Key Entry Points
- `src/App.tsx` — main UI, page routing (Download, Library, Search, etc.), detail overlays
- `src-tauri/src/lib.rs` — Tauri setup, command registration, plugin config
- `src/bindings.ts` — auto-generated IPC types (NEVER edit manually)
- `src/providers/AppProviders.tsx` — React providers (QueryClient, i18n)
- `src/components/layout/AppLayout.tsx` — tab-based navigation (AppPage enum)
