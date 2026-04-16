import { useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import type { NotificationItem } from '@/bindings';

export function useMarkNotificationsSeen(items: NotificationItem[], enabled = true) {
  const queryClient = useQueryClient();
  const didMarkRef = useRef(false);

  const mutation = useMutation({
    mutationFn: (latestCreatedAt: string) => api.markNotificationsSeen(latestCreatedAt),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
    onError: (err) => {
      void logger.error(`[notifications] Failed to mark seen: ${err}`);
    },
  });

  useEffect(() => {
    const first = items[0];
    if (!enabled || didMarkRef.current || !first) return;
    didMarkRef.current = true;
    mutation.mutate(first.created_at);
  }, [items, enabled, mutation]);

  return mutation;
}
