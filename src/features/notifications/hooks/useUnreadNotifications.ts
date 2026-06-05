import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useIsSignedIn } from '@/features/auth/store';

export function useUnreadNotifications() {
  const isSignedIn = useIsSignedIn();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.getUnreadCount(),
    enabled: isSignedIn,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data?.unread) {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'feed'] });
    }
  }, [query.data?.unread, queryClient]);

  return query;
}
