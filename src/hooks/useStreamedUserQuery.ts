import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';

interface UseStreamedUserQueryOptions<T> {
  eventName: string;
  queryKey: QueryKey;
  queryFn: () => Promise<T[]>;
  getItemsFromEvent: (payload: unknown) => T[];
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export function useStreamedUserQuery<T>({
  eventName,
  queryKey,
  queryFn,
  getItemsFromEvent,
  enabled = true,
  staleTime,
  gcTime,
}: UseStreamedUserQueryOptions<T>) {
  const [streamedItems, setStreamedItems] = useState<T[]>([]);
  const streamedRef = useRef<T[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    streamedRef.current = [];
    setStreamedItems([]);

    const promise = listen<unknown>(eventName, (event) => {
      if (cancelled) return;
      const items = getItemsFromEvent(event.payload);
      const updated = [...streamedRef.current, ...items];
      streamedRef.current = updated;
      setStreamedItems(updated);
    });

    return () => {
      cancelled = true;
      promise.then((unlisten) => unlisten());
    };
  }, [eventName, enabled, getItemsFromEvent]);

  const resetStreamedItems = useCallback(() => {
    setStreamedItems([]);
    streamedRef.current = [];
  }, []);

  const query = useQuery<T[]>({
    queryKey,
    queryFn: async () => {
      resetStreamedItems();
      return queryFn();
    },
    enabled,
    retry: false,
    staleTime,
    gcTime,
  });

  const data = query.data ?? (streamedItems.length > 0 ? streamedItems : undefined);
  const isStreaming = query.isLoading && streamedItems.length > 0;

  return {
    ...query,
    data,
    isLoading: query.isLoading && !data,
    isStreaming,
  };
}
