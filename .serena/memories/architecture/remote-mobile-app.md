# Remote Mobile App — src-remote/

## Overview
A standalone React mini-app for phone browser remote control of the desktop app.
- No Tauri APIs, no desktop stores, no shadcn/ui
- Connects via WebSocket (RemoteState pushes, RemoteCommand sends) and REST search
- Entry: `src-remote/index.html` (Vite root = `src-remote/`)

## Build Wiring
- `vite.remote.config.ts` — Vite config, root: `src-remote`, output: `src-tauri/remote-dist/`
- `tsconfig.remote.json` — type-check config for `src-remote/` + `src/lib/remote-protocol.ts`
- `tsconfig.json` — `src-remote` in exclude so main typecheck ignores it
- `tailwind.config.js` — includes `./src-remote/**/*.{ts,tsx}` in content

## Key Files
| File | Purpose |
|------|---------|
| `src-remote/dict.ts` | Tiny i18n: `t(key, language)` for en/fr |
| `src-remote/useRemoteSocket.ts` | WS hook with auto-reconnect backoff [1,2,4,8,8]s |
| `src-remote/App.tsx` | Token check, `RemoteApp` child (hooks-safe), tab bar |
| `src-remote/useWaveform.ts` | Fetch waveform JSON (AbortController, silent failure), returns `{ samples: number[] \| null }` |
| `src-remote/components/Waveform.tsx` | Canvas waveform (DPR, ResizeObserver, pointer-event scrub, 48px tall) |
| `src-remote/components/NowPlaying.tsx` | Artwork, title/artist, waveform (fallback: tappable progress bar); requires `onCommand` prop |
| `src-remote/components/Transport.tsx` | Prev/play-pause/next, volume slider (no seek bar) |
| `src-remote/components/QueueList.tsx` | Track list, cursor highlight, skipTo |
| `src-remote/components/SearchTab.tsx` | Debounced search, TrackInfo→RemoteTrack mapping, toasts |

## Protocol
- Shared types in `src/lib/remote-protocol.ts` (imported via `@/lib/remote-protocol`)
- Only import from `@/lib/remote-protocol` — never other `src/` files
- Search endpoint returns Rust `TrackInfo[]` with snake_case fields (artwork_url, permalink_url, waveform_url, duration in ms, user.username, user.id)
- CSS vars for theming: --bg, --bg-card, --bg-input, --text, --text-muted, --accent, --border

## Build Commands
```bash
npx tsc -p tsconfig.remote.json --noEmit   # type check
npx vite build --config vite.remote.config.ts   # build to src-tauri/remote-dist/
```
