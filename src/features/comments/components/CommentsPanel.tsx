import { Loader2, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTrackComments } from '../hooks/useTrackComments';
import { CommentThreadRow } from './CommentThreadRow';

interface CommentsPanelProps {
  trackId: number | undefined;
  variant: 'rail' | 'sheet';
}

export function CommentsPanel({ trackId, variant }: CommentsPanelProps) {
  const { t } = useTranslation();
  const { threads, isLoading, error, isFetchingNextPage, sentinelRef } = useTrackComments(trackId);

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
      </div>
    );
  }

  const containerClass = variant === 'rail' ? 'flex-1 overflow-y-auto px-3' : 'overflow-y-auto px-4 max-h-[50vh]';

  return (
    <div className={containerClass}>
      {threads.map((thread) => (
        <CommentThreadRow key={thread.root.id} thread={thread} />
      ))}
      <div ref={sentinelRef} className="h-8 flex items-center justify-center">
        {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
