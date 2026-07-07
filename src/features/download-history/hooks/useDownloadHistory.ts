import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/tauri';

const HISTORY_QUERY_KEY = ['download-history'] as const;

export function useDownloadHistory() {
  return useQuery({
    queryKey: HISTORY_QUERY_KEY,
    queryFn: api.listDownloadHistory,
  });
}

export function useRemoveHistoryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.removeDownloadHistoryEntry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
    },
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.clearDownloadHistory(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
    },
  });
}
