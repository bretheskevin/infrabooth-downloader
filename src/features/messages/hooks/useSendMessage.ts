import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import type { ConversationMessage, MessagesPage } from '@/bindings';

export function useSendMessage(otherUserId: number) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const messagesKey = ['directMessages', 'messages', otherUserId];

  const mutation = useMutation({
    mutationFn: (content: string) => api.sendMessage(otherUserId, content),

    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });

      const snapshot = queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey);

      const currentUserId = snapshot?.pages[0]?.current_user_id ?? 0;

      const optimisticMessage: ConversationMessage = {
        content,
        sender_id: currentUserId,
        sent_at: new Date().toISOString(),
        track_embed: null,
      };

      queryClient.setQueryData<InfiniteData<MessagesPage>>(messagesKey, (old) => {
        if (!old || old.pages.length === 0) return old;
        const firstPage = old.pages[0]!;
        return {
          ...old,
          pages: [
            { ...firstPage, items: [optimisticMessage, ...firstPage.items] },
            ...old.pages.slice(1),
          ],
        };
      });

      return { snapshot };
    },

    onError: (_err, _content, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(messagesKey, context.snapshot);
      }
      toast.error(t('directMessages.sendError'));
      void logger.error(`Failed to send message: ${_err}`);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: messagesKey });
      void queryClient.invalidateQueries({ queryKey: ['directMessages', 'conversations'] });
    },
  });

  return {
    sendMessage: mutation.mutate,
    isPending: mutation.isPending,
  };
}
