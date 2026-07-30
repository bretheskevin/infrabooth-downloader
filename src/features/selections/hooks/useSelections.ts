import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/tauri';
import { useIsSignedIn } from '@/features/auth/store';

const STALE_TIME = 60 * 60 * 1000; // 1 hour
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 1 day

export function useSelections() {
  const isSignedIn = useIsSignedIn();

  return useQuery({
    queryKey: ['selections'],
    queryFn: api.getSelections,
    enabled: isSignedIn,
    staleTime: STALE_TIME,
    refetchInterval: ONE_DAY_MS,
    refetchIntervalInBackground: true,
    retry: false,
  });
}
