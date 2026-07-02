import { useState, useEffect, useRef } from 'react';
import type { RemoteTrack } from '@/lib/remote-protocol';
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchTracks(host, token, query));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, [query, host, token]);

  return { query, setQuery, results, loading };
}
