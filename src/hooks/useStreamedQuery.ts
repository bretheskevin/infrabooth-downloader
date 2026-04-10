import { useState, useEffect, useRef } from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import type { TrackInfo, TracksBatchEvent } from '@/bindings';

interface UseStreamedQueryOptions {
  eventName: string;
  entityId: number | null;
  queryKey: QueryKey;
  queryFn: () => Promise<TrackInfo[]>;
  enabled?: boolean;
  initialData?: TrackInfo[];
  staleTime?: number;
  gcTime?: number;
}

export function useStreamedQuery({
  eventName,
  entityId,
  queryKey,
  queryFn,
  enabled = true,
  initialData,
  staleTime,
  gcTime,
}: UseStreamedQueryOptions) {
  const [streamedTracks, setStreamedTracks] = useState<TrackInfo[]>([]);
  const streamedRef = useRef<TrackInfo[]>([]);
  const skipListener = !!initialData;

  useEffect(() => {
    if (!entityId || !enabled || skipListener) return;
    let cancelled = false;
    streamedRef.current = [];
    setStreamedTracks([]);

    const promise = listen<TracksBatchEvent>(eventName, (event) => {
      if (cancelled) return;
      if (event.payload.entityId === entityId) {
        const updated = [...streamedRef.current, ...event.payload.tracks];
        streamedRef.current = updated;
        setStreamedTracks(updated);
      }
    });

    return () => {
      cancelled = true;
      promise.then((unlisten) => unlisten());
    };
  }, [entityId, eventName, enabled, skipListener]);

  const query = useQuery<TrackInfo[]>({
    queryKey,
    queryFn,
    enabled: enabled && !initialData,
    initialData,
    retry: false,
    staleTime,
    gcTime,
  });

  useEffect(() => {
    if (query.data) {
      setStreamedTracks([]);
      streamedRef.current = [];
    }
  }, [query.data]);

  const tracks = query.data ?? (streamedTracks.length > 0 ? streamedTracks : undefined);
  const isStreaming = query.isLoading && streamedTracks.length > 0;

  return {
    ...query,
    data: tracks,
    isStreaming,
  };
}
