import { useArtistProfileStore } from '@/features/artist-profile';
import type { ActorInfo, PlaylistSummary, LibraryPlaylist } from '@/bindings';

export function openActorProfile(actor: ActorInfo, onClose: () => void) {
  useArtistProfileStore.getState().openProfile(actor.id, actor.username);
  onClose();
}

export function playlistSummaryToLibraryPlaylist(playlist: PlaylistSummary): LibraryPlaylist {
  return {
    id: playlist.id,
    title: playlist.title,
    username: playlist.user.username,
    user_id: playlist.user.id,
    artwork_url: playlist.artwork_url,
    track_count: playlist.track_count,
    duration: 0,
    permalink_url: playlist.permalink_url,
    is_owned: false,
    is_public: true,
    secret_token: null,
  };
}
