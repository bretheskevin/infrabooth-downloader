# Plan: Unified Playlist Detail View

**Spec**: `docs/kb/specs/unified-playlist-detail-view.md`

---

## Batch 1 -- Rust backend (no frontend dependency)

### Task 1.1: Enrich `ArtistPlaylist` struct

**Files**: `src-tauri/src/models/artist.rs`

1. Add a new `ArtistPlaylistUser` struct after `ArtistPlaylist`:
   ```rust
   #[derive(Debug, Clone, Serialize, Deserialize, Type)]
   pub struct ArtistPlaylistUser {
       pub id: u64,
       pub username: String,
   }
   ```
2. Add two new fields to `ArtistPlaylist` (after `secret_token`):
   ```rust
   #[serde(default)]
   pub duration: Option<u64>,
   #[serde(default)]
   pub user: Option<ArtistPlaylistUser>,
   ```
3. Update the test helper `make_raw` in `src-tauri/src/services/artist_playlists.rs` to include the new fields:
   ```rust
   duration: None,
   user: None,
   ```

**Verification**: `cargo check` from `src-tauri/`.

### Task 1.2: Unified Rust command `get_playlist_tracks`

**Files**: `src-tauri/src/commands/library.rs`, `src-tauri/src/commands/artist.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/services/events.rs`

1. In `src-tauri/src/commands/library.rs`, add a new command `get_playlist_tracks`:
   ```rust
   #[tauri::command]
   #[specta::specta]
   pub async fn get_playlist_tracks(
       playlist_id: u64,
       secret_token: Option<String>,
       app: tauri::AppHandle,
   ) -> Result<Vec<TrackInfo>, String> {
       let (token, _cid) = get_optional_auth_and_cid(&app).await?;

       let resolved_secret = secret_token
           .or_else(|| app.state::<LibraryCache>().get_secret_token(playlist_id));

       let on_batch = events::make_batch_emitter(&app, events::PLAYLIST_TRACKS_BATCH, playlist_id);

       playlist::fetch_playlist_by_id(playlist_id, resolved_secret.as_deref(), token.as_deref(), on_batch)
           .await
           .map_err(|e| e.to_string())
   }
   ```
   Note: Uses `get_optional_auth_and_cid` (not `require_auth_and_cid`) so it works for both authenticated and unauthenticated paths. Falls back to `LibraryCache.get_secret_token` when no explicit token is provided (preserves existing library behavior).

2. Add import for `get_optional_auth_and_cid` in `library.rs` if not already present (it's in `super::`/`commands/mod.rs`).

3. In `src-tauri/src/commands/artist.rs`, delete the `get_artist_playlist_tracks` function entirely.

4. In `src-tauri/src/services/events.rs`, delete the `ARTIST_PLAYLIST_TRACKS_BATCH` constant.

5. In `src-tauri/src/lib.rs`:
   - Remove `get_artist_playlist_tracks` from the import and the `invoke_handler` list.
   - Add `get_playlist_tracks` to the import from `commands::library` and the `invoke_handler` list.

6. In `src-tauri/src/commands/mod.rs`, update re-exports if needed (verify `get_playlist_tracks` is accessible).

**Verification**: `cargo check` from `src-tauri/`. After running `npm run tauri dev` (done by the user, not us), bindings in `src/bindings.ts` will regenerate with the new command.

### Task 1.3: Keep `get_library_playlist_tracks` temporarily

Do NOT delete `get_library_playlist_tracks` yet. It will be removed in Batch 4 after the frontend is fully migrated. This avoids breaking the app during the transition between binding regeneration and frontend migration.

---

## Batch 2 -- Frontend shared module (no call site changes yet)

### Task 2.1: Create `src/components/playlist-detail/types.ts`

**Files**: New file `src/components/playlist-detail/types.ts`

Define:
```typescript
import type { LibraryPlaylist, ArtistPlaylist, MessagePlaylistEmbed, PlaylistSummary, Selection, TrackInfo } from '@/bindings';

export interface PlaylistData {
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

export function fromLibraryPlaylist(p: LibraryPlaylist): PlaylistData { ... }
export function fromArtistPlaylist(p: ArtistPlaylist, artistName: string, authUserId: number | null): PlaylistData { ... }
export function fromMessagePlaylistEmbed(p: MessagePlaylistEmbed): PlaylistData { ... }
export function fromNotificationPlaylist(p: PlaylistSummary, authUserId: number | null): PlaylistData { ... }
export function fromSelection(s: Selection): PlaylistData { ... }
```

Key details for each adapter:
- `fromLibraryPlaylist`: Map `artwork_url` to `artworkUrl`, `track_count` to `trackCount`, `permalink_url` to `permalinkUrl`, `secret_token` to `secretToken`, `user_id` to `userId`. Preserve `is_owned` as `isOwned`.
- `fromArtistPlaylist`: Use `p.user?.username ?? artistName` for `username`, `p.user?.id ?? null` for `userId`, `p.duration ?? null` for `duration`. Compute `isOwned: p.user?.id != null && p.user.id === authUserId`.
- `fromMessagePlaylistEmbed`: Use `p.artist` for `username`, `p.artist_id` for `userId`. Compute `isOwned: p.artist_id === authUserId` (where authUserId can be null, making it false).
- `fromNotificationPlaylist`: Use `p.user.username` and `p.user.id`. Compute `isOwned` from `p.user.id === authUserId`. `duration: null`, `secretToken: null`.
- `fromSelection`: `username: 'SoundCloud'`, `userId: null`, `duration: null`, `isOwned: false`, `secretToken: null`. Use `stableNumericId(s.id)` for id (import from existing selections utils).

### Task 2.2: Create `src/components/playlist-detail/usePlaylistTracks.ts`

**Files**: New file `src/components/playlist-detail/usePlaylistTracks.ts`

```typescript
import { api } from '@/lib/tauri';
import { useStreamedQuery } from '@/hooks/useStreamedQuery';
import { DEFAULT_STALE_TIME, DEFAULT_GC_TIME } from '@/lib/query';
import type { TrackInfo } from '@/bindings';

export function usePlaylistTracks(playlistId: number, secretToken?: string | null, initialTracks?: TrackInfo[]) {
  return useStreamedQuery({
    eventName: 'playlist-tracks-batch',
    entityId: playlistId,
    queryKey: ['playlist-tracks', playlistId],
    queryFn: () => api.getPlaylistTracks(playlistId, secretToken ?? null),
    initialData: initialTracks,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}
```

Note: `api.getPlaylistTracks` will be added to `src/lib/tauri.ts` in this same task:
```typescript
getPlaylistTracks: (playlistId: number, secretToken: string | null): Promise<TrackInfo[]> =>
  commands.getPlaylistTracks(playlistId, secretToken).then(unwrap),
```

### Task 2.3: Create `src/components/playlist-detail/PlaylistHeroHeader.tsx`

**Files**: New file

Extract the `HeroHeader` function from `src/features/library/components/PlaylistDetailHeader.tsx` into this file. Adapt it to accept `PlaylistData` instead of `LibraryPlaylist`:

- Replace `playlist.artwork_url` with `artworkUrl` prop
- Replace `playlist.user_id` with `playlist.userId`
- Replace `playlist.username` with `playlist.username`
- Replace `playlist.duration` with `playlist.duration` (handle `null` -- show duration section only when duration is not null and > 0)
- Replace `playlist.title` with `playlist.title`
- Replace hardcoded "library.detail.breadcrumbLibrary" breadcrumb with `breadcrumbItems` prop
- Keep `useArtistProfile(playlist.userId)` for avatar (guard on userId being non-null)
- Keep `ArtistLink` / `ArtistAvatarImage` usage (guard on userId being non-null, fall back to plain text username)

Props:
```typescript
interface PlaylistHeroHeaderProps {
  playlist: PlaylistData;
  artworkUrl: string | null;
  trackCount: number;
  breadcrumbItems: BreadcrumbItem[];
  folderMetadata: React.ReactNode;
  actions?: React.ReactNode;
  onPlayAll?: () => void;
  onShuffle?: () => void;
}
```

Where `BreadcrumbItem` is `{ label: string; onClick?: () => void }` (already exists in the `Breadcrumb` component's props).

### Task 2.4: Create `src/components/playlist-detail/PlaylistNarrowHeader.tsx`

**Files**: New file

Extract the `NarrowHeader` function from `src/features/library/components/PlaylistDetailHeader.tsx`. Adapt similarly:

- When `playlist.userId` is present, show `ArtistLink` + duration (if available).
- When `playlist.userId` is null, show `playlist.username` as plain text + track count.
- Always show track count. Show duration only when non-null.
- `folderMetadata` and `actions` passed through.
- Uses `DetailHeader` component with `onBack` from breadcrumb items or dedicated prop.

### Task 2.5: Create `src/components/playlist-detail/PlaylistDetailHeader.tsx`

**Files**: New file

Simple widescreen switch:
```typescript
export function PlaylistDetailHeader(props: PlaylistDetailHeaderProps) {
  const isWidescreen = useIsWidescreen();
  return isWidescreen ? <PlaylistHeroHeader {...props} /> : <PlaylistNarrowHeader {...props} />;
}
```

The `PlaylistDetailHeaderProps` type is the union of both sub-headers' props (same interface since they share the same props).

### Task 2.6: Move `RemoveFromPlaylistDialog.tsx`

**Files**: 
- Copy `src/features/library/components/RemoveFromPlaylistDialog.tsx` to `src/components/playlist-detail/RemoveFromPlaylistDialog.tsx`
- No content changes needed (it's already self-contained with no library-specific imports)

### Task 2.7: Create `src/components/playlist-detail/PlaylistDetailView.tsx`

**Files**: New file

This is the unified view component. Structure:

```typescript
interface PlaylistDetailViewProps {
  playlist: PlaylistData;
  initialTracks?: TrackInfo[];
  breadcrumbItems: BreadcrumbItem[];
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
  scrollPreservation?: {
    get: () => number;
    set: (offset: number) => void;
  };
}
```

Implementation:
1. Call `usePlaylistTracks(playlist.id, playlist.secretToken, initialTracks)`.
2. Artwork fallback: `usePlaylistArtwork(playlist.id, playlist.secretToken, needsArtwork)` -- import from `src/features/library/hooks/usePlaylistArtwork.ts` (this hook stays in library since the Rust command uses the library cache; it's fine to import across features for shared components).
3. Remove-from-playlist state: `useState<TrackInfo | null>(null)` + `useRemoveFromPlaylist()` -- only when `playlist.isOwned`.
4. Scroll preservation: if `scrollPreservation` prop provided, pass `initialScrollOffset` and `onScrollOffsetChange` to `TrackListView.trackList`.
5. Share info: construct from `PlaylistData` fields.
6. Render `TrackListView` with header callback using `PlaylistDetailHeader`.
7. Render `RemoveFromPlaylistDialog` when `playlist.isOwned` and `trackToRemove` is set.

### Task 2.8: Create `src/components/playlist-detail/index.ts`

**Files**: New file

Barrel export:
```typescript
export { PlaylistDetailView } from './PlaylistDetailView';
export { PlaylistDetailHeader } from './PlaylistDetailHeader';
export type { PlaylistData } from './types';
export { fromLibraryPlaylist, fromArtistPlaylist, fromMessagePlaylistEmbed, fromNotificationPlaylist, fromSelection } from './types';
```

---

## Batch 3 -- Wire up call sites

### Task 3.1: Update `PlaylistsTabContent.tsx` (Library)

**Files**: `src/features/library/components/PlaylistsTabContent.tsx`

1. Change import from `'./PlaylistDetailView'` to `'@/components/playlist-detail'`.
2. Import `fromLibraryPlaylist` from `'@/components/playlist-detail'`.
3. Import `useLibraryStore` (already imported).
4. Import `useTranslation` for breadcrumb label.
5. Update the `<PlaylistDetailView>` usage:
   ```tsx
   <PlaylistDetailView
     playlist={fromLibraryPlaylist(libraryView.playlist)}
     breadcrumbItems={[{ label: t('library.detail.breadcrumbLibrary'), onClick: handleBackToList }]}
     onBack={handleBackToList}
     onDownloadTracks={onDownloadTracks}
     scrollPreservation={{
       get: () => useLibraryStore.getState().detailScrollTop,
       set: (offset) => useLibraryStore.getState().setDetailScrollTop(offset),
     }}
   />
   ```

### Task 3.2: Update `ArtistProfileView.tsx` (Artist profile)

**Files**: `src/features/artist-profile/components/ArtistProfileView.tsx`

1. Remove import of `ArtistPlaylistView`.
2. Import `PlaylistDetailView, fromArtistPlaylist` from `'@/components/playlist-detail'`.
3. Import `useAuthStore` from `'@/features/auth/store'` to get `authUserId`.
4. At the top of the component, get `const authUserId = useAuthStore((s) => s.userId);`.
5. Replace the `<ArtistPlaylistView>` block:
   ```tsx
   <PlaylistDetailView
     playlist={fromArtistPlaylist(selectedPlaylist, username, authUserId)}
     breadcrumbItems={[{ label: username, onClick: () => setSelectedPlaylist(null) }]}
     onBack={() => setSelectedPlaylist(null)}
     onDownloadTracks={onDownloadTracks}
   />
   ```

### Task 3.3: Update `App.tsx` -- all three call sites

**Files**: `src/App.tsx`

1. Remove imports:
   - `ArtistPlaylistView` from `'@/features/artist-profile'`
   - `PlaylistDetailView` from `'@/features/library/components/PlaylistDetailView'`
   - `toLibraryPlaylist` from `'@/features/selections/utils/adapter'`
   - `playlistSummaryToLibraryPlaylist` from `'@/features/notifications'`

2. Add imports:
   - `PlaylistDetailView, fromMessagePlaylistEmbed, fromNotificationPlaylist, fromSelection` from `'@/components/playlist-detail'`

3. Get `authUserId` in `PageContent`:
   ```typescript
   const authUserId = useAuthStore((s) => s.userId);
   ```

4. Update message playlist block (~line 98-106):
   ```tsx
   <PlaylistDetailView
     playlist={fromMessagePlaylistEmbed(messagePlaylist)}
     breadcrumbItems={[{ label: t('directMessages.title'), onClick: () => useMessagesStore.getState().closePlaylist() }]}
     onBack={() => useMessagesStore.getState().closePlaylist()}
     onDownloadTracks={handleDownloadTracks}
   />
   ```

5. Update notification playlist block (~line 111-118):
   ```tsx
   <PlaylistDetailView
     playlist={fromNotificationPlaylist(notificationPlaylist, authUserId)}
     breadcrumbItems={[{ label: t('notifications.title'), onClick: () => useNotificationsStore.getState().closePlaylist() }]}
     onBack={() => useNotificationsStore.getState().closePlaylist()}
     onDownloadTracks={handleDownloadTracks}
   />
   ```

6. Update selection mix block (~line 167-172):
   ```tsx
   <PlaylistDetailView
     playlist={fromSelection(selectedMix)}
     initialTracks={selectedMix.tracks}
     breadcrumbItems={[{ label: selectedMix.shortTitle, onClick: handleBackFromMix }]}
     onBack={handleBackFromMix}
     onDownloadTracks={handleDownloadTracks}
   />
   ```

### Task 3.4: Update `src/features/artist-profile/index.ts`

**Files**: `src/features/artist-profile/index.ts`

Remove the `ArtistPlaylistView` export line.

### Task 3.5: Update `src/features/notifications/utils.ts` and `src/features/notifications/index.ts`

**Files**: `src/features/notifications/utils.ts`, `src/features/notifications/index.ts`

1. Remove `playlistSummaryToLibraryPlaylist` function from `utils.ts`.
2. Remove its export from `index.ts` if exported there.
3. Check if the file still has other exports; if empty, delete it.

### Task 3.6: Update `src/features/selections/utils/adapter.ts`

**Files**: `src/features/selections/utils/adapter.ts`

1. Remove `toLibraryPlaylist` function.
2. If the file has other exports (like `stableNumericId`), keep those. If `stableNumericId` is the only other thing and it's now imported by the shared types, keep it exported.
3. If the file becomes empty except for `stableNumericId`, keep it as-is since it's used by the shared adapter.

---

## Batch 4 -- Cleanup and tests

### Task 4.1: Delete old files

**Files to delete**:
- `src/features/artist-profile/components/ArtistPlaylistView.tsx`
- `src/features/artist-profile/hooks/useArtistPlaylistTracks.ts`
- `src/features/artist-profile/__test__/ArtistPlaylistView.test.tsx`
- `src/features/library/components/PlaylistDetailView.tsx`
- `src/features/library/components/PlaylistDetailHeader.tsx`
- `src/features/library/hooks/usePlaylistTracks.ts`
- `src/features/library/components/RemoveFromPlaylistDialog.tsx` (moved to shared)

### Task 4.2: Remove `get_library_playlist_tracks` from Rust

**Files**: `src-tauri/src/commands/library.rs`, `src-tauri/src/lib.rs`

1. Delete the `get_library_playlist_tracks` function from `commands/library.rs`.
2. Remove it from the import and `invoke_handler` list in `lib.rs`.
3. Remove `getLibraryPlaylistTracks` from `src/lib/tauri.ts`.

### Task 4.3: Remove `getArtistPlaylistTracks` from `src/lib/tauri.ts`

**Files**: `src/lib/tauri.ts`

Delete the `getArtistPlaylistTracks` line from the `api` object.

### Task 4.4: Update tests

**Files**:
- `src/features/library/components/__test__/PlaylistDetailHeader.test.tsx` -- update imports to `@/components/playlist-detail`. Update mock playlist to use `PlaylistData` shape instead of `LibraryPlaylist`. The test structure (widescreen/narrow, artwork, breadcrumb) should remain the same but props may need adjustment.
- Create `src/components/playlist-detail/__test__/PlaylistDetailView.test.tsx` -- basic smoke test: renders title, passes playlist data to TrackListView, shows remove dialog when isOwned.
- Create `src/components/playlist-detail/__test__/types.test.ts` -- unit tests for adapter functions (each adapter produces correct PlaylistData from its source type).

### Task 4.5: Verify no broken imports

Run `npm run typecheck` to ensure no TypeScript errors remain. Run `npm test` to ensure all tests pass.

---

## Batch execution order

```
Batch 1 (Rust) ──> Batch 2 (shared module) ──> Batch 3 (wire call sites) ──> Batch 4 (cleanup + tests)
```

Batches are sequential because each depends on the previous. Within each batch, tasks are independent and can be parallelized except where noted:
- Batch 1: Tasks 1.1 and 1.2 can run in parallel (1.2 does not depend on 1.1).
- Batch 2: Tasks 2.1-2.2 first (types + hook), then 2.3-2.6 in parallel (headers + dialog), then 2.7 (view depends on all above), then 2.8 (barrel).
- Batch 3: All tasks can run in parallel (each modifies a different file).
- Batch 4: Task 4.1 first (deletions), then 4.2-4.3 in parallel (Rust + TS cleanup), then 4.4 (tests), then 4.5 (verification).

## Risk notes

- **Binding regeneration**: After Rust changes in Batch 1, `src/bindings.ts` must be regenerated by running `npm run tauri dev` briefly. The new `get_playlist_tracks` command and enriched `ArtistPlaylist` type will appear in bindings. Batch 2 depends on these regenerated bindings. The user should run `npm run tauri dev` between Batch 1 and Batch 2.
- **`usePlaylistArtwork` cross-feature import**: The shared `PlaylistDetailView` imports `usePlaylistArtwork` from `src/features/library/hooks/`. This is acceptable for a shared component that aggregates feature behavior. If this feels wrong later, the hook can be moved to `src/hooks/` or `src/components/playlist-detail/`.
- **`useRemoveFromPlaylist` cross-feature import**: Same pattern -- shared component imports from library feature. The hook uses optimistic cache updates on the `['playlist-tracks', playlistId]` query key, which now aligns with the unified key.
- **`stableNumericId` dependency**: The `fromSelection` adapter needs `stableNumericId` from `src/features/selections/utils/adapter.ts`. Either import it directly or move the utility to `src/lib/utils.ts`.
