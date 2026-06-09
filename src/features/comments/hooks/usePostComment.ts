import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { CommentsPage, TrackComment } from '@/bindings';
import { useAuthStore } from '@/features/auth/store';
import { getApiErrorMessage } from '@/lib/errorMessages';
import { logger } from '@/lib/logger';
import { postComment } from '../api/postComment';

export interface PostCommentParams {
  body: string;
  timestamp: number;
  replyToPermalink: string | null;
}

export function usePostComment(trackId: number | undefined) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const avatarUrl = useAuthStore((s) => s.avatarUrl);

  const mutation = useMutation({
    mutationFn: (params: PostCommentParams) => {
      if (!trackId) return Promise.reject(new Error('No track ID'));
      return postComment(trackId, params.body, params.timestamp, params.replyToPermalink);
    },
    onMutate: async (params) => {
      if (!trackId || !isSignedIn || !userId) return;

      const queryKey = ['track-comments', trackId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<InfiniteData<CommentsPage>>(queryKey);

      const optimisticComment: TrackComment = {
        id: Date.now(),
        body: params.replyToPermalink ? `@${params.replyToPermalink}: ${params.body}` : params.body,
        createdAt: new Date().toISOString(),
        timestampMs: params.timestamp,
        user: {
          id: userId,
          username: username ?? '',
          avatar_url: avatarUrl ?? null,
          permalink: '',
          permalink_url: '',
        },
      };

      queryClient.setQueryData<InfiniteData<CommentsPage>>(queryKey, (old) => {
        if (!old) return old;
        const firstPage = old.pages[0];
        if (!firstPage) return old;
        return {
          ...old,
          pages: [{ ...firstPage, comments: [optimisticComment, ...firstPage.comments] }, ...old.pages.slice(1)],
        };
      });

      return { previous };
    },
    onSuccess: () => {
      if (!trackId) return;
      void queryClient.invalidateQueries({ queryKey: ['track-comments', trackId] });
      void logger.info(`[comments] Posted comment on track ${trackId}`);
    },
    onError: (err, _params, context) => {
      if (trackId && context?.previous) {
        queryClient.setQueryData(['track-comments', trackId], context.previous);
      }
      toast.error(getApiErrorMessage(err, t, 'comments.postError'));
      void logger.error(`[comments] Failed to post comment on track ${trackId}: ${err}`);
    },
  });

  const submitComment = (params: PostCommentParams) => {
    mutation.mutate(params);
  };

  return { submitComment, isPosting: mutation.isPending };
}
