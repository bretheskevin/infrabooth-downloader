import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { CommentsPage } from '@/bindings';
import { getApiErrorMessage } from '@/lib/errorMessages';
import { logger } from '@/lib/logger';
import { deleteComment } from '../api/deleteComment';

export function useDeleteComment(trackId: number | undefined) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (commentId: number) => {
      if (!trackId) return Promise.reject(new Error('No track ID'));
      return deleteComment(trackId, commentId);
    },
    onMutate: async (commentId: number) => {
      if (!trackId) return;
      const queryKey = ['track-comments', trackId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<InfiniteData<CommentsPage>>(queryKey);
      queryClient.setQueryData<InfiniteData<CommentsPage>>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({ ...page, comments: page.comments.filter((c) => c.id !== commentId) })),
        };
      });
      return { previous };
    },
    onSuccess: () => {
      if (!trackId) return;
      void queryClient.invalidateQueries({ queryKey: ['track-comments', trackId] });
      void logger.info(`[comments] Deleted comment on track ${trackId}`);
    },
    onError: (err, _commentId, context) => {
      if (trackId && context?.previous) {
        queryClient.setQueryData(['track-comments', trackId], context.previous);
      }
      toast.error(getApiErrorMessage(err, t, 'comments.deleteError'));
      void logger.error(`[comments] Failed to delete comment on track ${trackId}: ${err}`);
    },
  });

  return { deleteComment: mutation.mutate, isDeleting: mutation.isPending };
}
