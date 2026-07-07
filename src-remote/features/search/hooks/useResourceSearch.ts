import { useState, useEffect } from 'react';

export interface UseResourceSearchResult<T> {
  results: T[];
  loading: boolean;
}

type Fetcher<T> = (host: string, token: string, query: string) => Promise<T[]>;

export function useResourceSearch<T>(host: string, token: string, debouncedQuery: string, fetcher: Fetcher<T>): UseResourceSearchResult<T> {
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetcher(host, token, debouncedQuery)
      .then((data) => {
        if (!cancelled) setResults(data);
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
  }, [debouncedQuery, host, token, fetcher]);

  return { results, loading };
}
