import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import { getApiErrorMessage } from '@/lib/errorMessages';
import { insertOptimisticMessage, invalidateConversation, normalizeContent, rollbackOptimisticMessage } from '../utils/optimisticMessages';

export function useSendMessage(otherUserId: number) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (content: string) => api.sendMessage(otherUserId, content),

    onMutate: async (content: string) => {
      const snapshot = await insertOptimisticMessage(queryClient, otherUserId, content);
      return { snapshot };
    },

    onError: (err, _content, context) => {
      rollbackOptimisticMessage(queryClient, otherUserId, context?.snapshot);
      toast.error(getApiErrorMessage(err, t, 'directMessages.sendError'));
      void logger.error(`Failed to send message: ${err}`);
    },

    onSettled: () => {
      invalidateConversation(queryClient, otherUserId);
    },
  });

  return {
    sendMessage: (content: string) => mutation.mutate(normalizeContent(content)),
    isPending: mutation.isPending,
  };
}
