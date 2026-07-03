import { useState, useEffect } from 'react';
import { resolveArtwork } from '../api/library';
import type { LibraryPlaylist } from '../utils/filterPlaylists';

export function useResolvedArtwork(host: string, token: string, playlist: LibraryPlaylist): string | null {
  const [resolved, setResolved] = useState<string | null>(null);
  const needsArtwork = playlist.artworkUrl === null;

  useEffect(() => {
    if (!needsArtwork) return;
    let cancelled = false;
    resolveArtwork(host, token, playlist.id, playlist.secretToken)
      .then((url) => {
        if (!cancelled) setResolved(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [host, token, playlist.id, playlist.secretToken, needsArtwork]);

  return playlist.artworkUrl ?? resolved;
}
