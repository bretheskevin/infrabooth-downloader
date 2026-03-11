import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import { api } from '@/lib/tauri';
import type { TrackInfo } from '@/bindings';

interface PlaylistTracksBatchEvent {
  playlistId: number;
  tracks: TrackInfo[];
}

export function usePlaylistTracks(playlistId: number) {
  const [streamedTracks, setStreamedTracks] = useState<TrackInfo[]>([]);
  const streamedRef = useRef<TrackInfo[]>([]);

  // Listen for batch events from Tauri backend
  useEffect(() => {
    let cancelled = false;
    streamedRef.current = [];
    setStreamedTracks([]);

    const promise = listen<PlaylistTracksBatchEvent>('playlist-tracks-batch', (event) => {
      if (cancelled) return;
      if (event.payload.playlistId === playlistId) {
        const updated = [...streamedRef.current, ...event.payload.tracks];
        streamedRef.current = updated;
        setStreamedTracks(updated);
      }
    });

    return () => {
      cancelled = true;
      promise.then((unlisten) => unlisten());
    };
  }, [playlistId]);

  const query = useQuery<TrackInfo[]>({
    queryKey: ['playlist-tracks', playlistId],
    queryFn: () => api.getLibraryPlaylistTracks(playlistId),
  });

  // Once the query completes, clear streamed tracks (final data is authoritative)
  useEffect(() => {
    if (query.data) {
      setStreamedTracks([]);
      streamedRef.current = [];
    }
  }, [query.data]);

  // Return streamed tracks while loading, final data when complete
  const tracks = query.data ?? (streamedTracks.length > 0 ? streamedTracks : undefined);
  const isStreaming = query.isLoading && streamedTracks.length > 0;

  return {
    ...query,
    data: tracks,
    isStreaming,
  };
}
