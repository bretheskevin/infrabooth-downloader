# Spec: Unified Playlist Detail View

## Problem

Two separate components render playlist track lists with divergent feature sets:

| Capability | Library `PlaylistDetailView` | Artist `ArtistPlaylistView` |
|---|---|---|
| Hero header (widescreen) | Yes | No |
| Play All / Shuffle buttons | Yes | No |
| Remove from playlist | Yes (when `is_owned`) | No |
| Artwork fallback resolution | Yes (`usePlaylistArtwork`) | No |
| Scroll position preservation | Yes (via library store) | No |
| Artist avatar in header | Yes (via `useArtistProfile`) | No |
| Duration display | Yes | No (missing from type) |
| Breadcrumb navigation | Library-specific only | Artist-specific only |
| Rust command | `get_library_playlist_tracks` (requires auth, uses cached secret_token) | `get_artist_playlist_tracks` (optional auth, explicit secret_token) |
| Event channel | `playlist-tracks-batch` | `artist-playlist-tracks-batch` |
| Query key | `['playlist-tracks', id]` | `['artist-playlist-tracks', id, secretToken]` |

Both are thin wrappers (~70-100 lines) around the same `TrackListView` component and both call `playlist::fetch_playlist_by_id` on the Rust side.

## Solution

### Rust changes

**1. Enrich `ArtistPlaylist` struct** (`src-tauri/src/models/artist.rs`)

Add three fields with `#[serde(default)]` so existing API responses that include these fields will now parse them:

```rust
pub struct ArtistPlaylist {
    // existing fields...
    #[serde(default)]
    pub duration: Option<u64>,
    #[serde(default)]
    pub user: Option<ArtistPlaylistUser>,
}
```

New helper struct for the nested `user` object:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ArtistPlaylistUser {
    pub id: u64,
    pub username: String,
}
```

**2. Unified Rust command** (`src-tauri/src/commands/library.rs`)

Replace the two commands with one:

```rust
pub async fn get_playlist_tracks(
    playlist_id: u64,
    secret_token: Option<String>,
    app: tauri::AppHandle,
) -> Result<Vec<TrackInfo>, String>
```

Logic:
- Try `get_optional_auth_and_cid()` (not `require_auth_and_cid`)
- If no explicit `secret_token` provided, fall back to `LibraryCache.get_secret_token(playlist_id)`
- Use `PLAYLIST_TRACKS_BATCH` event (single channel)
- Call `playlist::fetch_playlist_by_id` with the resolved token + optional auth

**3. Remove `get_artist_playlist_tracks`** from `commands/artist.rs` and its registration in `lib.rs`.

**4. Remove `ARTIST_PLAYLIST_TRACKS_BATCH`** constant from `events.rs`.

### Frontend shared module (`src/components/playlist-detail/`)

**1. `types.ts`** -- Normalized `PlaylistData` type

```typescript
interface PlaylistData {
  id: number;
  title: string;
  artworkUrl: string | null;
  trackCount: number;
  permalinkUrl: string;
  secretToken: string | null;
  username: string | null;
  userId: number | null;
  duration: number | null;
  isOwned: boolean;
}
```

Adapter functions:
- `fromLibraryPlaylist(p: LibraryPlaylist): PlaylistData`
- `fromArtistPlaylist(p: ArtistPlaylist, artistName: string, authUserId: number | null): PlaylistData`
- `fromMessagePlaylistEmbed(p: MessagePlaylistEmbed): PlaylistData`
- `fromNotificationPlaylist(p: PlaylistSummary): PlaylistData`
- `fromSelection(s: Selection): PlaylistData`

Each adapter normalizes to camelCase and computes `isOwned` by comparing `userId` with the auth store's `userId` (except `fromLibraryPlaylist` which preserves the existing `is_owned` flag).

**2. `usePlaylistTracks.ts`** -- Single hook

```typescript
function usePlaylistTracks(playlistId: number, secretToken?: string | null, initialTracks?: TrackInfo[])
```

- Query key: `['playlist-tracks', playlistId]` (same playlist = same data)
- Event: `'playlist-tracks-batch'`
- API call: `api.getPlaylistTracks(playlistId, secretToken ?? null)`
- Uses `useStreamedQuery` with `DEFAULT_STALE_TIME` / `DEFAULT_GC_TIME`
- `initialData` pass-through for selections that already have tracks

**3. `PlaylistHeroHeader.tsx`** -- Extracted hero layout

Props: `PlaylistData` fields + `trackCount`, `artworkUrl`, `breadcrumbItems`, `folderMetadata`, `actions`, `onPlayAll`, `onShuffle`.

Renders the widescreen hero layout currently in `PlaylistDetailHeader.tsx`'s `HeroHeader`. Uses `useArtistProfile(userId)` for avatar when `userId` is present, otherwise falls back to username text only.

**4. `PlaylistNarrowHeader.tsx`** -- Extracted narrow layout

Renders the narrow `DetailHeader` layout. Shows artist info (with `ArtistLink` when `userId` is present, plain text when not), track count, and optionally duration.

**5. `PlaylistDetailHeader.tsx`** -- Widescreen switch

```typescript
function PlaylistDetailHeader(props: PlaylistDetailHeaderProps) {
  const isWidescreen = useIsWidescreen();
  return isWidescreen ? <PlaylistHeroHeader {...props} /> : <PlaylistNarrowHeader {...props} />;
}
```

Props interface includes:
- `playlist: PlaylistData`
- `artworkUrl: string | null` (resolved artwork, may differ from playlist's)
- `trackCount: number`
- `breadcrumbItems: BreadcrumbItem[]`
- `folderMetadata: ReactNode`
- `actions: ReactNode`
- `onPlayAll?: () => void`
- `onShuffle?: () => void`

**6. `PlaylistDetailView.tsx`** -- Unified view

Props:
```typescript
interface PlaylistDetailViewProps {
  playlist: PlaylistData;
  initialTracks?: TrackInfo[];
  breadcrumbItems: BreadcrumbItem[];
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
  scrollPreservation?: { get: () => number; set: (offset: number) => void };
}
```

Features wired:
- Data fetching via unified `usePlaylistTracks(playlist.id, playlist.secretToken, initialTracks)`
- Artwork fallback via `usePlaylistArtwork` when `artworkUrl` is null and no `initialTracks`
- Play All / Shuffle (always available -- TrackListView already provides these callbacks)
- Remove from playlist (when `playlist.isOwned`)
- Scroll preservation (optional, provided by library call site)
- `RemoveFromPlaylistDialog` rendered inline
- Share info constructed from `PlaylistData`

**7. Move `RemoveFromPlaylistDialog.tsx`** from `src/features/library/components/` to `src/components/playlist-detail/`.

### Call site updates

**`PlaylistsTabContent.tsx`** (Library):
```typescript
<PlaylistDetailView
  playlist={fromLibraryPlaylist(libraryView.playlist)}
  breadcrumbItems={[{ label: t('library.detail.breadcrumbLibrary'), onClick: handleBackToList }]}
  onBack={handleBackToList}
  onDownloadTracks={onDownloadTracks}
  scrollPreservation={{ get: () => useLibraryStore.getState().detailScrollTop, set: (o) => useLibraryStore.getState().setDetailScrollTop(o) }}
/>
```

**`ArtistProfileView.tsx`** (Artist profile):
```typescript
<PlaylistDetailView
  playlist={fromArtistPlaylist(selectedPlaylist, username, authUserId)}
  breadcrumbItems={[{ label: username, onClick: () => setSelectedPlaylist(null) }]}
  onBack={() => setSelectedPlaylist(null)}
  onDownloadTracks={onDownloadTracks}
/>
```

**`App.tsx`** (Message playlist embed):
```typescript
<PlaylistDetailView
  playlist={fromMessagePlaylistEmbed(messagePlaylist)}
  breadcrumbItems={[{ label: t('directMessages.title'), onClick: () => useMessagesStore.getState().closePlaylist() }]}
  onBack={() => useMessagesStore.getState().closePlaylist()}
  onDownloadTracks={handleDownloadTracks}
/>
```

**`App.tsx`** (Notification playlist):
```typescript
<PlaylistDetailView
  playlist={fromNotificationPlaylist(notificationPlaylist)}
  breadcrumbItems={[{ label: t('notifications.title'), onClick: () => useNotificationsStore.getState().closePlaylist() }]}
  onBack={() => useNotificationsStore.getState().closePlaylist()}
  onDownloadTracks={handleDownloadTracks}
/>
```

**`App.tsx`** (Selection mix):
```typescript
<PlaylistDetailView
  playlist={fromSelection(selectedMix)}
  initialTracks={selectedMix.tracks}
  breadcrumbItems={[{ label: selectedMix.shortTitle, onClick: handleBackFromMix }]}
  onBack={handleBackFromMix}
  onDownloadTracks={handleDownloadTracks}
/>
```

### Files to delete

- `src/features/artist-profile/components/ArtistPlaylistView.tsx`
- `src/features/artist-profile/hooks/useArtistPlaylistTracks.ts`
- `src/features/artist-profile/__test__/ArtistPlaylistView.test.tsx`
- `src/features/library/components/PlaylistDetailView.tsx` (replaced by shared)
- `src/features/library/components/PlaylistDetailHeader.tsx` (replaced by shared)
- `src/features/library/hooks/usePlaylistTracks.ts` (replaced by shared)

### Files to update (not delete)

- `src/features/library/components/__test__/PlaylistDetailHeader.test.tsx` -- update imports to shared component
- `src/features/selections/utils/adapter.ts` -- replace `toLibraryPlaylist` with `fromSelection` returning `PlaylistData`
- `src/features/notifications/utils.ts` -- replace `playlistSummaryToLibraryPlaylist` with `fromNotificationPlaylist` returning `PlaylistData`
- `src-tauri/src/lib.rs` -- update command registration
- `src-tauri/src/commands/mod.rs` -- update re-exports
- `src/lib/tauri.ts` -- add `getPlaylistTracks`, remove `getArtistPlaylistTracks` (keep `getLibraryPlaylistTracks` as alias during transition or remove if bindings regenerate)
- `src/features/artist-profile/index.ts` -- remove `ArtistPlaylistView` export

### i18n

No new keys needed. The unified view will use the existing `library.detail.*` keys for the hero header and `artistProfile.playlistTrackCount` for the narrow header subtitle when shown from artist context. The breadcrumb label is passed in by each call site.

### `isOwned` detection strategy

- `fromLibraryPlaylist`: Preserves the `is_owned` field already computed by the Rust backend (compares playlist `user_id` with authenticated `user_id`).
- `fromArtistPlaylist`: Computes `isOwned` by comparing `playlist.user?.id` (newly enriched field) with the auth store's `userId` parameter passed in by the call site.
- `fromMessagePlaylistEmbed`, `fromNotificationPlaylist`: Compare `artist_id`/`user.id` with auth store's `userId`.
- `fromSelection`: Always `false` (SoundCloud curated selections are not user-owned).

### Artwork fallback

The unified view uses `usePlaylistArtwork` for artwork resolution. This hook calls `resolve_library_artwork` which requires auth and uses the library cache. For the non-library path, we need to either:
- **Option A**: Make `resolve_library_artwork` work without the library cache (accept explicit `secret_token` and skip cache lookup when not found) -- already the case, it accepts `secret_token` as a parameter.
- **Option B**: Only use artwork fallback when `artworkUrl` is null and no `initialTracks` -- already the current behavior.

The current `resolve_library_artwork` command requires auth (`require_auth_and_cid`). For artist playlists viewed without auth, the artwork URL is already present from the playlist API response, so fallback resolution is rarely needed. We keep the current behavior (fallback only when artwork is missing).
