# Playlist Actions Dropdown (aka "Library Actions")

The 3-dot dropdown menu on playlist detail views is `PlaylistActionsDropdown` at:
`src/features/library/components/PlaylistActionsDropdown.tsx`

(Relocated from `rekordbox-export/TrackListActionsDropdown` — it's the playlist-level actions menu used by all playlist detail views via `TrackListView`.) Contains: like/unlike, copy link, open in browser, Rekordbox export, share by DM, and delete (owned playlists only).

Aliases: "library actions", "playlist actions", "playlist menu", "playlist dropdown"

Used by: `TrackListView` → rendered in `PlaylistDetailView` header area.
