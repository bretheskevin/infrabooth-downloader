# Frontend Architecture

## Structure (`src/`)
```
App.tsx                 — page routing, detail view overlays, download conflict dialog
main.tsx               — React root
providers/AppProviders  — QueryClientProvider + I18nextProvider + AppInitializer
components/            — shared components
  layout/              — AppLayout (tab nav), Header
  track-list/          — reusable track list view (TrackListView, TrackListItems, TrackListToolbar, useTrackListState)
  ui/                  — shadcn/ui primitives (40+ components)
config/                — feature-flags.toml (WIP UI gating)
features/              — feature modules (self-contained)
hooks/                 — shared hooks
lib/                   — utilities (logger, i18n, tauri, utils, date, format, sort, featureFlags, etc.)
locales/               — en.json, fr.json
test/                  — test setup (tauri mocks, localStorage, query wrapper, factories)
bindings.ts            — auto-generated Tauri IPC types
```

## Features (17 modules)
Each follows pattern: components/ + hooks/ + api/ + store.ts + __test__/ + index.ts

### Core
- **download** — DownloadMainView, DownloadTab, useDownloadPipeline
- **url-input** — URL validation, track/playlist preview, download bar
- **queue** — download queue management, progress tracking, rate limit dialog, retry
  - Store split: queueStateSlice + queueProgressSlice + queueRetrySlice
- **progress** — track cards, status badges/icons/labels, overall progress, geo-block handling
- **completion** — success/error panels, failure grouping

### Library & Social
- **library** — playlist list/detail, liked tracks tab, downloaded tracks, remove from playlist
- **search** — track + artist search with infinite scroll
- **artist-profile** — artist page (banner, tabs: tracks/playlists/likes, follow button), ArtistLink (clickable artist navigation, exported for reuse), followers/followings lists with navigation stack (ArtistFollowList, ArtistFollowRow, useArtistFollowList)
- **selections** — SoundCloud curated selections display

### Messaging
- **messages** — direct messaging with other SoundCloud users
  - Components: ConversationsList, ConversationRow, ConversationPage, MessageRow, MessageBell, MessageTrackCard, MessagePlaylistCard, MessageUserCard
  - Hooks: useConversationsPage, useConversationMessages, useSendMessage (optimistic updates), useUnreadConversations, useResolveEmbed
  - Supports track, playlist, and user profile embeds in messages
  - ShareTrackDialog: share tracks to conversations via DM (search, pick conversation, send)

### Comments
- **comments** — read-only track comments with timestamp seek, nested reply threads
  - Components: CommentsPanel (rail/sheet variant), CommentThreadRow, CommentRow (timestamp seek chip, avatar profile navigation)
  - Hooks: useTrackComments (infinite query + buildCommentThreads + infinite scroll)
  - API: getTrackComments (offset-paginated via Tauri command)
  - Types: CommentThread (root + replies grouped by timestampMs)

### Activity Feed
- **new-tracks** — followed artists new tracks carousel, activity badges
- **new-releases** — new releases carousel (card + list layouts via ReleaseCard/ReleaseListRow), release tracklist, artist releases view, ReleaseArtwork + getReleaseMeta() shared helpers
- **new-albums** — new albums feature

### Settings & System
- **rekordbox-export** — export playlists to Rekordbox (TrackListActionsDropdown, ExportPhaseSection, useRekordboxExport with cancellation + download progress, useRekordboxDetection)
- **settings** — settings dialog with sidebar nav (General, Playlists, Rekordbox, About)
  - Sections: DownloadLocation, Language, Theme, ConcurrentDownloads, StreamMode, Crossfade, PlaylistOrder, RekordboxSettings (status + manual path), BackupSection (restore with confirmation)
  - Store: persisted Zustand with download path, language, theme, max concurrent, crossfade, stream mode, playlist order, view mode (card/list), rekordbox path override
  - `helpers.ts` — makeSetter, makeClampedSetter, pickKeys helpers to reduce store boilerplate
- **auth** — sign in/out, cookie-based auth, user menu (My Profile shortcut, sign out), startup auth check, userId in auth state
- **update** — update banner, version check
- **changelog** — what's new dialog, changelog parsing, version tracking

### Player
- **player** — full audio player with crossfade support
  - `audio-engine.ts` — dual-slot HLS.js player, crossfade ramps, state machine
  - Store split: playbackSlice + queueSlice + shuffleSlice + autoplaySlice + uiSlice
  - Components: PlayerContainer, ExpandedBar, MiniPill, Waveform, SeekBar, TransportControls, VolumeControl, QueuePanel, ScrollingText

## Shared Components (`src/components/`)
- TrackRow, TrackRowContent, TrackRowActions, TrackRowSkeleton — track display
- InteractiveTrackRow — selectable track with actions
- SelectAllCheckbox, SelectionActionBar — batch operations
- TrackActionsDropdown, TrackDownloadAction — context menus
- DetailHeader, ArtistAvatar, ArtistAvatarImage, ArtistCarouselSection (sorts artists with new content first, reposts before originals by default)
- CreatePlaylistDialog — dialog for creating new SoundCloud playlists (name input + public/private switch)
- EditPlaylistDialog — dialog for editing owned playlists (title, public/private, remove/undo tracks)
- CardListView — generic primitive rendering card or list mode based on settings
- ViewModeToggle — UI control for toggling between card/list layouts
- FilterChips, SortDirectionSelect, PreserveOrderToggle
- FolderMetadata, OpenFolderButton, PlaylistPickerSubmenu, AppDialogs

## Shared Hooks (`src/hooks/`)
- useTrackSelection, useTrackDownloader, useTrackDownload, useDownloadSelected
- useLinkActions, useLikeTrack, usePlayPauseToggle, useFollowedArtists, useAddToPlaylist
- useSearchFilter, useDebounce, useInfiniteScroll, useVirtualizedList
- useFolderPath, useFolderSelection, useOpenDownloadFolder
- useStreamedQuery (progressive batch loading — overrides isLoading once first batch arrives), useStreamedUserQuery, useMarkSeenQuery, useAppVersion, useDownloadState
- useMergedTrackState, useTrackDownloadState, useHoverPreload
- useMenuExclusivity, useTauriEventDialog, useSticky
- useCreatePlaylist (create SoundCloud playlist with toast + cache invalidation)
- useEditPlaylist (edit SoundCloud playlist: title, sharing, track list + toast + cache invalidation)

## Feature Flags (`src/lib/featureFlags.ts`, `src/config/feature-flags.toml`)
- Boolean flags for gating WIP UI areas
- Parsed at startup; unknown keys or non-boolean values throw
- Current flags: none active (rekordbox flag shipped and removed)

## IPC Layer (`src/lib/tauri.ts`)
- `api` object wraps all Tauri commands (40+ methods)
- `ApiError` class with code field
- `unwrap()` helper for error handling
- Types: AnyError, StringError
