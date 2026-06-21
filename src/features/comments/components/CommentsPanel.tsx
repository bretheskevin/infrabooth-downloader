import { Loader2, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useIsSignedIn } from '@/features/auth/store';
import { usePlayerStore } from '@/features/player/store';
import { useTrackComments } from '../hooks/useTrackComments';
import { usePostComment } from '../hooks/usePostComment';
import { useDeleteComment } from '../hooks/useDeleteComment';
import { CommentInput } from './CommentInput';
import { CommentThreadRow } from './CommentThreadRow';

interface CommentsPanelProps {
  trackId: number | undefined;
  variant: 'rail' | 'sheet';
  trackArtistId: number | undefined;
}

export function CommentsPanel({ trackId, variant, trackArtistId }: CommentsPanelProps) {
  const { t } = useTranslation();
  const { threads, isLoading, error, isFetchingNextPage, sentinelRef } = useTrackComments(trackId);
  const { submitComment, isPosting } = usePostComment(trackId);
  const isSignedIn = useIsSignedIn();
  const currentUserId = useAuthStore((s) => s.userId);
  const { deleteComment } = useDeleteComment(trackId);

  const handleTopLevelSubmit = (body: string) => {
    const positionMs = Math.round(usePlayerStore.getState().positionMs ?? 0);
    submitComment({ body, timestamp: positionMs, replyToPermalink: null });
  };

  const stateClass = variant === 'rail' ? 'flex-1' : 'py-12';

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${stateClass}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${stateClass}`}>
        <p className="text-sm text-destructive">{t('comments.error')}</p>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 py-12 ${stateClass}`}>
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('comments.empty')}</p>
        {isSignedIn && trackId && (
          <div className="w-full max-w-sm mt-2">
            <CommentInput onSubmit={handleTopLevelSubmit} placeholder={t('comments.addComment')} isSubmitting={isPosting} />
          </div>
        )}
      </div>
    );
  }

  const containerClass = variant === 'rail' ? 'flex-1 overflow-y-auto px-3' : 'overflow-y-auto px-4 max-h-[50vh]';

  return (
    <div className={containerClass}>
      {isSignedIn && trackId && (
        <div className="py-3 mb-3 border-b border-border/30">
          <CommentInput onSubmit={handleTopLevelSubmit} placeholder={t('comments.addComment')} isSubmitting={isPosting} />
        </div>
      )}
      {threads.map((thread) => (
        <CommentThreadRow
          key={thread.root.id}
          thread={thread}
          submitComment={submitComment}
          isPosting={isPosting}
          deleteComment={deleteComment}
          currentUserId={currentUserId ?? undefined}
          trackArtistId={trackArtistId}
          canReply={isSignedIn}
        />
      ))}
      <div ref={sentinelRef} className="h-8 flex items-center justify-center">
        {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
