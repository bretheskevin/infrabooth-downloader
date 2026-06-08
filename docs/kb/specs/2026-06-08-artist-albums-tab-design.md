# Design: Artist "Albums" tab + albums in New Releases

**Date:** 2026-06-08
**Scope:** Medium (Rust service + command + event + frontend hook + UI + i18n; plus new-releases per-artist merge)

## Goal

1. Add an **"Albums"** tab to the artist profile (`src/features/artist-profile/`) that lists an artist's albums, fetched from `GET /users/{id}/albums`. It must behave **exactly like the existing "Playlists" tab** (grid/list, search, streamed batches, drill-in to a detail view for download).
2. Ensure an artist's **recent albums also surface in New Releases** (`src/features/new-releases/`) via a **lazy per-artist merge** when a single artist's release list is opened.

## Key facts (from exploration)

- `GET /users/{id}/albums` returns the **identical JSON shape** as playlists (`kind:"playlist"`, `is_album:true`, `set_type:"album"`). The existing `ArtistPlaylist` model + `RawPlaylistItem` mapping (artwork falls back to first track) apply unchanged.
- The Playlists tab uses `/users/{id}/playlists_without_albums` — albums are **explicitly excluded** there, so the two tabs are disjoint.
- New Releases is built from the `/stream` feed (followed artists, ≤30 days, `MAX_STREAM_PAGES=2`). `resolve_release_type(is_album, set_type)` already maps to `ReleaseType::Album/EP/Single/Compilation/Playlist`. The per-artist list is served by `get_artist_releases` from the stream cache.

## Decisions (confirmed with user)

- **Tab order:** `Recent · Popular · Playlists · Albums · Likes` (Albums **after** Playlists).
- **Album drill-in:** reuse `PlaylistDetailView` + `fromArtistPlaylist` (identical to playlists — same download/track-list UX).
- **New-releases merge:** **lazy per-artist** — only inside `get_artist_releases`. Accepted gap: an album the `/stream` missed won't light the carousel badge, but **will** appear once that artist is opened.
- **Backend structure:** mirror playlists with a **parallel** command + event + hook (not a parameterized toggle), reusing the `ArtistPlaylist` model.

## Backend changes (`src-tauri/`)

### 1. Service — albums fetch (`services/artist_playlists.rs`)
Add `fetch_artist_albums` alongside `fetch_artist_playlists`, hitting `/users/{id}/albums`. **DRY:** extract the shared body of `fetch_artist_playlists` into a private helper parameterized by the endpoint segment (`"playlists_without_albums"` vs `"albums"`); both public fns delegate to it. Reuse `RawPlaylistItem` / `into_artist_playlist` and the artwork-fallback tests unchanged.

### 2. Event (`services/events.rs`)
Add `ARTIST_ALBUMS_BATCH = "artist-albums-batch"`, an `ArtistAlbumsBatchEvent { entity_id, albums: Vec<ArtistPlaylist> }` (mirror `ArtistPlaylistsBatchEvent` — keep field name consistent with the hook's `getItemsFromEvent`; spec uses `albums`), and `make_album_batch_emitter`. Register the event type in `lib.rs` `collect_events!`/builder next to `ArtistPlaylistsBatchEvent`.

### 3. Command (`commands/artist.rs`)
Add `get_artist_albums(app, artist_id) -> Result<Vec<ArtistPlaylist>, String>` mirroring `get_artist_playlists`, using `make_album_batch_emitter` + `fetch_artist_albums`. Register in `lib.rs` `invoke_handler` + specta builder.

### 4. New-releases lazy merge (`commands/new_tracks.rs` + `services/new_tracks.rs`)
- Add a service fn (e.g. `fetch_artist_album_releases(client_id, token, datadome, artist_id) -> Vec<ReleaseActivityItem>`): fetch `/users/{id}/albums`, map each album → `ReleaseInfo` (reuse `resolve_release_type`, artwork fallback) wrapped in `ReleaseActivityItem { activity_type: ReleaseActivityType::New, created_at: <album display/created date> }`, filtered to **within 30 days** (`is_within_30_days`, same window as stream).
- In `get_artist_releases`: keep the existing stream-cache fetch, then fetch album-releases, **merge + dedup by `release.id`** (stream entry wins on conflict), `sort_by_created_at_desc`. Reuse existing `dedup_by_id` / `sort_by_created_at_desc` helpers.
- Leave `get_followed_artists` and carousel badge logic **unchanged** (lazy decision).

## Frontend changes (`src/`)

### 5. Hook (`features/artist-profile/hooks/useArtistAlbums.ts`)
Mirror `useArtistPlaylists`: `useStreamedUserQuery<ArtistPlaylist>` with `eventName:'artist-albums-batch'`, `queryKey:['artist-albums', artistId]`, `queryFn: () => api.getArtistAlbums(artistId!)`, `getItemsFromEvent` reading `event.albums`.

### 6. Grid reuse (`features/artist-profile/components/PlaylistGrid.tsx`)
`PlaylistGrid` currently calls `useArtistPlaylists` internally and hardcodes playlist i18n keys. **Refactor** to receive the query result + a `labels` set (error/empty/search/noResults/loading) as props, so both tabs reuse it. `ArtistProfileView` calls the appropriate hook and passes results + labels. (Avoids conditional hooks; keeps one grid component.) Reuse `PlaylistCard`/`PlaylistListRow` as-is.

### 7. Tabs (`features/artist-profile/components/ProfileTabs.tsx`)
Add `{ key:'albums', label:'artistProfile.albums' }` to `TAB_OPTIONS` **after** `playlists`. `ProfileTab` type updates automatically.

### 8. View wiring (`features/artist-profile/components/ArtistProfileView.tsx`)
- `isAlbumsTab = activeTab === 'albums'`; include in the `sortOption` guard (use `'recent'`) and in `canDownload` exclusion (like `isPlaylistsTab`).
- Render the grid for albums tab using `useArtistAlbums` data; **reuse the existing `selectedPlaylist` state + `PlaylistDetailView`** for drill-in (same `ArtistPlaylist` type), so albums and playlists share one detail path.

### 9. i18n (`src/locales/{en,fr}.json`)
Add under `artistProfile`: `albums`, `albumsError`, `noAlbums`, `searchAlbums`, `noAlbumResults` (mirror the playlist keys). Reuse `common.loadingPlaylists` or add `common.loadingAlbums`. French translations natural, not literal.

## Out of scope
- Full-coverage album fetch at the new-releases overview (carousel badges) — explicitly deferred (lazy decision).
- Any change to the existing Playlists tab behavior or the `/stream` pipeline.
- `src/bindings.ts` is **regenerated** by tauri-specta (never hand-edited).

## Testing
- Rust: unit test for `fetch_artist_album_releases` mapping (album → `ReleaseActivityItem`, release_type, 30-day filter) and the merge/dedup in `get_artist_releases` (album already in stream → no dup). Keep existing `artist_playlists` tests passing after the DRY refactor.
- Frontend: `PlaylistGrid` after refactor still renders playlists; add a test that it renders album data + album labels. Mirror existing `PlaylistGrid.test.tsx`.
- No tests for i18n keys or tab toggles per project conventions.

## Pattern References (mirror these exactly)
- `src-tauri/src/services/artist_playlists.rs` — fetch + `RawPlaylistItem` mapping + tests
- `src-tauri/src/commands/artist.rs` (`get_artist_playlists`) + `src-tauri/src/services/events.rs` (`make_playlist_batch_emitter`, `ArtistPlaylistsBatchEvent`)
- `src/features/artist-profile/hooks/useArtistPlaylists.ts` + `components/PlaylistGrid.tsx`
- `src-tauri/src/services/new_tracks.rs` (`resolve_release_type`, `ReleaseActivityItem`, `dedup_by_id`, `sort_by_created_at_desc`, `is_within_30_days`) + `commands/new_tracks.rs` (`get_artist_releases`)
