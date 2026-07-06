import { useState, useEffect, useRef, useCallback } from 'react';
import type { RemoteSelection } from '../api/selections';
import { fetchSelections } from '../api/selections';

interface UseSelectionsResult {
  selections: RemoteSelection[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

export function useSelections(host: string, token: string): UseSelectionsResult {
  const [selections, setSelections] = useState<RemoteSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fetched = useRef(false);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setSelections(await fetchSelections(host, token));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [host, token]);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    void doFetch();
  }, [doFetch]);

  const refetch = useCallback(() => {
    void doFetch();
  }, [doFetch]);

  return { selections, loading, error, refetch };
}
