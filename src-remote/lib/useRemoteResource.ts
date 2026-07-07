import { useState, useEffect, useRef, useCallback } from 'react';

interface UseRemoteResourceResult<T> {
  data: T[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

export function useRemoteResource<T>(fetchFn: () => Promise<T[]>, initialLoading = false): UseRemoteResourceResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(false);
  const fetched = useRef(false);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await fetchFn());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    void doFetch();
  }, [doFetch]);

  const refetch = useCallback(() => {
    void doFetch();
  }, [doFetch]);

  return { data, loading, error, refetch };
}
