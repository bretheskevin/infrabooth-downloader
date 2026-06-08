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
  isPublic: boolean;
  isPublicKnown: boolean;
}

export function fromLibraryPlaylist(p: LibraryPlaylist): PlaylistData {
  return {
    id: p.id,
    title: p.title,
    artworkUrl: p.artwork_url,
    trackCount: p.track_count,
    permalinkUrl: p.permalink_url,
    secretToken: p.secret_token,
    username: p.username,
    userId: p.user_id,
    duration: p.duration,
    isOwned: p.is_owned,
    isPublic: p.is_public,
    isPublicKnown: true,
  };
}

export function fromArtistPlaylist(
  p: ArtistPlaylist,
  artistName: string,
  authUserId: number | null,
  ownerId?: number | null,
): PlaylistData {
  const userId = p.user?.id ?? ownerId ?? null;
  return {
    id: p.id,
    title: p.title,
    artworkUrl: p.artwork_url,
    trackCount: p.track_count,
    permalinkUrl: p.permalink_url,
    secretToken: p.secret_token ?? null,
    username: p.user?.username ?? artistName,
    userId,
    duration: p.duration ?? null,
    isOwned: userId != null && userId === authUserId,
    isPublic: p.is_public ?? false,
    isPublicKnown: true,
  };
}

export function fromMessagePlaylistEmbed(p: MessagePlaylistEmbed, authUserId: number | null): PlaylistData {
  return {
    id: p.id,
    title: p.title,
    artworkUrl: p.artwork_url,
    trackCount: p.track_count,
    permalinkUrl: p.permalink_url,
    secretToken: p.secret_token,
    username: p.artist,
    userId: p.artist_id,
    duration: null,
    isOwned: p.artist_id === authUserId,
    isPublic: false,
    isPublicKnown: false,
  };
}

export function fromNotificationPlaylist(p: PlaylistSummary, authUserId: number | null): PlaylistData {
  return {
    id: p.id,
    title: p.title,
    artworkUrl: p.artwork_url,
    trackCount: p.track_count,
    permalinkUrl: p.permalink_url,
    secretToken: null,
    username: p.user.username,
    userId: p.user.id,
    duration: null,
    isOwned: p.user.id === authUserId,
    isPublic: false,
    isPublicKnown: false,
  };
}

// DJB2 hash, forced negative to avoid collision with real SoundCloud IDs (always positive)
function stableNumericId(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash > 0 ? -hash : hash || -1;
}

export function fromSelection(s: Selection): PlaylistData {
  const totalDuration = s.tracks.reduce((sum: number, t: TrackInfo) => sum + t.duration, 0);

  return {
    id: stableNumericId(s.id),
    title: s.title,
    artworkUrl: s.artworkUrl,
    trackCount: s.trackCount,
    permalinkUrl: '',
    secretToken: null,
    username: 'SoundCloud',
    userId: null,
    duration: totalDuration,
    isOwned: false,
    isPublic: false,
    isPublicKnown: false,
  };
}
