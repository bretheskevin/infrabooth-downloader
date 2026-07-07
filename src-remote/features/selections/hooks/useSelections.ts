import { useCallback } from 'react';
import { useRemoteResource } from '@remote/lib/useRemoteResource';
import type { RemoteSelection } from '../api/selections';
import { fetchSelections } from '../api/selections';

interface UseSelectionsResult {
  selections: RemoteSelection[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

export function useSelections(host: string, token: string): UseSelectionsResult {
  const fetchFn = useCallback(() => fetchSelections(host, token), [host, token]);
  const { data, loading, error, refetch } = useRemoteResource<RemoteSelection>(fetchFn, true);
  return { selections: data, loading, error, refetch };
}
