import { useState, useEffect } from 'react';
import type { RemoteTrack } from '@/lib/remote-protocol';
import { useDebounce } from '@/lib/useDebounce';
import { searchTracks } from '../api/searchTracks';

const DEBOUNCE_MS = 400;

export interface UseTrackSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: RemoteTrack[];
  loading: boolean;
}

export function useTrackSearch(host: string, token: string): UseTrackSearchResult {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RemoteTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchTracks(host, token, debouncedQuery)
      .then((tracks) => {
        if (!cancelled) setResults(tracks);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, host, token]);

  return { query, setQuery, results, loading };
}
