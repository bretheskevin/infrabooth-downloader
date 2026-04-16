import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useIsSignedIn } from '@/features/auth/store';

export function useUnreadConversations() {
  const isSignedIn = useIsSignedIn();

  return useQuery({
    queryKey: ['directMessages', 'unread'],
    queryFn: () => api.getUnreadConversationsFlag(),
    enabled: isSignedIn,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });
}
