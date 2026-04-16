import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useIsSignedIn } from '@/features/auth/store';

export function useUnreadNotifications() {
  const isSignedIn = useIsSignedIn();

  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.getUnreadCount(),
    enabled: isSignedIn,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });
}
