# Playlist Actions Dropdown (aka "Library Actions")

The 3-dot dropdown menu on playlist detail views is `PlaylistActionsDropdown` at:
`src/features/library/components/PlaylistActionsDropdown.tsx`

(Relocated from `rekordbox-export/TrackListActionsDropdown` — it's the playlist-level actions menu used by all playlist detail views via `TrackListView`.) Contains: like/unlike, copy link, open in browser, Rekordbox export, share by DM, and delete (owned playlists only).

Aliases: "library actions", "playlist actions", "playlist menu", "playlist dropdown"

Used by: `TrackListView` → rendered in `PlaylistDetailView` header area.

**Ownership detection**: each `from*` adapter in `playlist-detail/types.ts` computes `isOwned` against `authUserId`, so `PlaylistDetailView` uses `playlist.isOwned` directly. `fromArtistPlaylist` accepts an optional `ownerId` fallback for when `p.user` is null (artist-profile playlists), and `fromMessagePlaylistEmbed` takes `authUserId` to detect owned DM-embedded playlists.

**Edit visibility safety**: `PlaylistData.isPublicKnown` is `true` only for library playlists (the backend provides `is_public`); other adapters leave it `false`. `EditPlaylistDialog` hides the public/private toggle and sends `sharing: null` (preserved server-side) when `isPublicKnown` is false, avoiding a silent visibility flip. The dialog also disables Save until `tracksReady` (all tracks loaded) so a partial track list can't truncate the playlist on the `PUT /playlists` replace.
