import type { Selection, LibraryPlaylist, TrackInfo } from '@/bindings';

// DJB2 hash, forced negative to avoid collision with real SoundCloud IDs (always positive)
function stableNumericId(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash > 0 ? -hash : hash || -1;
}

export function toLibraryPlaylist(selection: Selection): LibraryPlaylist {
  const totalDuration = selection.tracks.reduce((sum: number, t: TrackInfo) => sum + t.duration, 0);

  return {
    id: stableNumericId(selection.id),
    title: selection.title,
    username: 'SoundCloud',
    user_id: null,
    artwork_url: selection.artworkUrl,
    track_count: selection.trackCount,
    duration: totalDuration,
    permalink_url: '',
    is_owned: false,
    is_public: true,
    secret_token: null,
  };
}
