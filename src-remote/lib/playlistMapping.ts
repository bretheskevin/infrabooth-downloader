export interface LibraryPlaylist {
  id: number;
  title: string;
  username: string;
  userId: number | null;
  artworkUrl: string | null;
  trackCount: number;
  duration: number;
  permalinkUrl: string;
  isOwned: boolean;
  isPublic: boolean;
  secretToken: string | null;
}

export interface LibraryPlaylistJson {
  id: number;
  title: string;
  username: string;
  user_id: number | null;
  artwork_url: string | null;
  track_count: number;
  duration: number;
  permalink_url: string;
  is_owned: boolean;
  is_public: boolean;
  secret_token: string | null;
}

export function mapPlaylist(p: LibraryPlaylistJson): LibraryPlaylist {
  return {
    id: p.id,
    title: p.title,
    username: p.username,
    userId: p.user_id,
    artworkUrl: p.artwork_url,
    trackCount: p.track_count,
    duration: p.duration,
    permalinkUrl: p.permalink_url,
    isOwned: p.is_owned,
    isPublic: p.is_public,
    secretToken: p.secret_token,
  };
}
