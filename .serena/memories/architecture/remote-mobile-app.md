# Remote Mobile App — src-remote/

## Overview
A standalone React mini-app for phone browser remote control of the desktop app.
- No Tauri APIs, no desktop stores, no shadcn/ui
- Connects via WebSocket (RemoteState pushes, RemoteCommand sends) and REST search
- Entry: `src-remote/index.html` (Vite root = `src-remote/`)

## Build Wiring
- `vite.remote.config.ts` — Vite config, root: `src-remote`, output: `src-tauri/remote-dist/`
- `src-remote/tsconfig.json` — type-check config for `src-remote/` + `src/lib/remote-protocol.ts` (paths: `@/*` -> `../src/*`, `@remote/*` -> `./*`). NOTE: there is NO `tsconfig.remote.json` — that name is stale.
- `tsconfig.json` — `src-remote` in exclude so main typecheck ignores it
- `tailwind.config.js` — includes `./src-remote/**/*.{ts,tsx}` in content

## Key Files
| File | Purpose |
|------|---------|
| `src-remote/lib/i18n.ts` | Tiny i18n: `t(key, language)` reads `remote.*` from `src/locales/{en,fr}.json` |
| `src-remote/hooks/useRemoteSocket.ts` | WS hook with auto-reconnect backoff [1,2,4,8,8]s |
| `src-remote/App.tsx` | Token check, `RemoteApp` child (hooks-safe), tab bar |
| `src-remote/features/now-playing/components/NowPlaying.tsx` | Artwork, title/artist, waveform (fallback: tappable progress bar) |
| `src-remote/features/now-playing/components/Transport.tsx` | Prev/play-pause/next, volume slider |
| `src-remote/features/queue/components/QueueList.tsx` | Track list, cursor highlight, skipTo |
| `src-remote/features/library/components/LibraryTab.tsx` | Library playlists w/ FilterChips (all/mine/liked); drills into shared PlaylistDetail |
| `src-remote/components/PlaylistList.tsx` / `PlaylistDetail.tsx` | SHARED playlist UI (moved out of library feature); used by both library + search. Render `LibraryPlaylist[]`; detail loads tracks via `/api/playlist-tracks` (id + optional secret) |
| `src-remote/lib/playlistMapping.ts` | SHARED `LibraryPlaylist`/`LibraryPlaylistJson` types + `mapPlaylist`; used by library api + search api |
| `src-remote/hooks/useResolvedArtwork.ts` / `usePlaylistTracks.ts` | SHARED hooks (moved out of library feature) |
| `src-remote/features/search/components/SearchTab.tsx` | Three-tab search (tracks/playlists/albums) with shared debounced query, SelectionsSection shelf on tracks empty-state, PlaylistDetail drill-down |
| `src-remote/features/search/hooks/useResourceSearch.ts` | Generic fetch hook: takes pre-debounced query + fetcher, manages results/loading with cancel-on-change. `useTrackSearch` was removed — SearchTab calls useResourceSearch directly per type |
| `src-remote/features/search/api/{searchTracks,searchPlaylists,searchAlbums}.ts` | Fetch `/api/search`, `/api/search-playlists`, `/api/search-albums` |

## Backend routes (src-tauri/src/services/remote.rs)
Axum handlers follow: token check -> get client_id/auth -> call service -> `Json(...)`. Routes: `/api/search`, `/api/search-playlists`, `/api/search-albums` (playlist/album search map `ArtistPlaylist` -> `library::LibraryPlaylist` via `artist_playlist_to_library`), `/api/library`, `/api/playlist-tracks`, `/api/library-artwork`, `/api/selections`. Playlist/album search reuses the existing `search::search_playlists`/`search_albums` services (also used by desktop).

## Protocol
- Shared types in `src/lib/remote-protocol.ts` (imported via `@/lib/remote-protocol`)
- Search track endpoints return Rust `TrackInfo[]` snake_case (artwork_url, permalink_url, waveform_url, duration in ms, user.username, user.id); playlist/album endpoints return `LibraryPlaylistJson[]`
- CSS vars for theming: --bg, --bg-card, --bg-input, --text, --text-muted, --accent, --border

## Build Commands
```bash
npm run typecheck        # tsc --noEmit && tsc -p src-remote/tsconfig.json  (main + remote)
npm run build:remote     # vite build --config vite.remote.config.ts -> src-tauri/remote-dist/
npm test                 # vitest run (covers src + src-remote)
```
