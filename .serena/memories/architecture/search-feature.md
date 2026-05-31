# Search Feature (`src/features/search/`)

Tabbed search UI hosted in App.tsx `PageContent` (default tab when activePage='search').

## Frontend
- `store.ts` — `SearchType` union (`'tracks' | 'artists' | 'playlists'`), `inputValue`, `searchType`. Tiny Zustand store.
- `playlist-overlay-store.ts` — `useSelectedPlaylistStore` Zustand store for playlist detail overlay (`selectedPlaylist: ArtistPlaylist | null`, `openPlaylist`, `closePlaylist`). Follows notifications store overlay pattern.
- `components/SearchTab.tsx` — SearchBar + Tabs (Tracks/Artists/Playlists). Hosts all three result lists. Folder picker shown only on tracks tab.
- `hooks/useInfiniteSearchQuery.ts` — generic infinite search hook. Takes `{queryKey, queryFn: (q, limit, offset) => Promise<{collection}>, enabled}`. DEBOUNCE_MS=400, SEARCH_LIMIT=20. Pagination via offset.
- `hooks/useSearchQuery.ts` (tracks), `hooks/useArtistSearchQuery.ts` (users), `hooks/usePlaylistSearchQuery.ts` (playlists) — thin wrappers over the generic hook.
- `components/SearchListShell.tsx` — shared list shell handling empty/loading/error/no-results + infinite scroll. Used by ArtistSearchResultList.
- `components/ArtistSearchResultList.tsx` / `ArtistSearchResultItem.tsx` — artist results; item opens profile via `useArtistProfileStore.getState().openProfile(id, username)`.

## Backend
- `services/search.rs` — generic `search_api::<Raw, Out>(client_id, query, limit, offset, endpoint)` hits `{API_V2_BASE}/search/{endpoint}`. `search_tracks` (endpoint "tracks") + `search_users` (endpoint "users") + `search_playlists` (endpoint "playlists_without_albums"). Public response types `SearchResponse`, `UserSearchResponse`, `PlaylistSearchResponse` with `collection` + `total_results`. `RawPlaylistSearchItem` uses `#[serde(flatten)]` on `ArtistPlaylist` base with artwork fallback to first track.
- `commands/search.rs` — `search_tracks`, `search_users`, `search_playlists` tauri commands; fetch client_id then call service.
- Registered in `lib.rs` collect_commands + import list.

## Playlist rendering / navigation prior art
- `ArtistPlaylist` binding type already models playlist search results (id, title, artwork_url, track_count, created_at, permalink_url, secret_token, duration, user).
- `services/artist_playlists.rs` deserializes `playlists_without_albums` into ArtistPlaylist with artwork fallback to first track (`RawPlaylistItem`).
- `artist-profile/components/PlaylistGrid.tsx` renders ArtistPlaylist[] via CardListView (PlaylistCard / PlaylistListRow) + ViewModeToggle.
- `components/playlist-detail/` — `PlaylistDetailView` (takes `PlaylistData`, `breadcrumbItems`, `onDownloadTracks`), adapters in `types.ts` incl. `fromArtistPlaylist(p, artistName, authUserId)`.
- Detail overlay navigation: most features use a global Zustand store + a branch in App.tsx `PageContent` (artist profile, messages, notifications, selections). ArtistProfileView opens playlist detail via LOCAL `useState(selectedPlaylist)` + breadcrumb back to profile. No global "selected playlist" store exists.

## i18n
- `search.*` keys in en.json/fr.json: tabTracks, tabArtists, tabPlaylists, placeholder(Artists/Playlists), emptyState(Artists/Playlists), noArtistResults, noPlaylistResults, noResults, errorSearch, followers, tracks, playlistTrackCount, loadingMore.
