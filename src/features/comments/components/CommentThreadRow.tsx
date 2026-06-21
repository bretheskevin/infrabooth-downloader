import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TrackComment } from '@/bindings';
import type { CommentThread } from '../types';
import type { PostCommentParams } from '../hooks/usePostComment';
import { CommentInput } from './CommentInput';
import { CommentRow } from './CommentRow';

interface CommentThreadRowProps {
  thread: CommentThread;
  submitComment: (params: PostCommentParams) => void;
  isPosting: boolean;
  deleteComment: (commentId: number) => void;
  currentUserId: number | undefined;
  trackArtistId: number | undefined;
  canReply: boolean;
}

export function CommentThreadRow({
  thread,
  submitComment,
  isPosting,
  deleteComment,
  currentUserId,
  trackArtistId,
  canReply,
}: CommentThreadRowProps) {
  const { t } = useTranslation();
  const [replyingToId, setReplyingToId] = useState<number | null>(null);

  const handleReply = (body: string, parentPermalink: string, parentTimestamp: number) => {
    submitComment({ body, timestamp: parentTimestamp, replyToPermalink: parentPermalink });
    setReplyingToId(null);
  };

  const renderCommentWithReply = (comment: TrackComment, isReply: boolean, showTimestamp: boolean) => (
    <div key={comment.id}>
      <CommentRow
        comment={comment}
        isReply={isReply}
        showTimestamp={showTimestamp}
        onReply={canReply ? () => setReplyingToId(comment.id) : undefined}
        onDelete={deleteComment}
        currentUserId={currentUserId}
        trackArtistId={trackArtistId}
      />
      {replyingToId === comment.id && (
        <div className="pl-10 pb-2">
          <CommentInput
            onSubmit={(body) => handleReply(body, comment.user.permalink, thread.root.timestampMs)}
            placeholder={t('comments.replyTo', { username: comment.user.username })}
            isSubmitting={isPosting}
            autoFocus
            onCancel={() => setReplyingToId(null)}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="border-b border-border/30 last:border-0">
      {renderCommentWithReply(thread.root, false, true)}
      {thread.replies.map((reply) => renderCommentWithReply(reply, true, false))}
    </div>
  );
}
