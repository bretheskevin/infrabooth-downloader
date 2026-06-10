import { useState } from 'react';
import { Play, Reply, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TrackComment } from '@/bindings';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useArtistProfileStore } from '@/features/artist-profile/store';
import { usePlayerStore } from '@/features/player/store';
import { formatRelativeTime } from '@/lib/date';
import { formatDuration } from '@/lib/format';
import { linkifyText } from '@/lib/linkify';

interface CommentRowProps {
  comment: TrackComment;
  isReply?: boolean;
  showTimestamp?: boolean;
  onReply?: () => void;
  onDelete?: (commentId: number) => void;
  currentUserId?: number;
  trackArtistId?: number;
}

export function CommentRow({
  comment,
  isReply = false,
  showTimestamp = false,
  onReply,
  onDelete,
  currentUserId,
  trackArtistId,
}: CommentRowProps) {
  const { t } = useTranslation();
  const { user } = comment;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const canDelete = !!onDelete && !!currentUserId && (comment.user.id === currentUserId || trackArtistId === currentUserId);

  const avatarSize = isReply ? 24 : 32;

  const handleProfileClick = () => {
    useArtistProfileStore.getState().openProfile(user.id, user.username);
  };

  const handleSeek = () => {
    usePlayerStore.getState().seek(comment.timestampMs);
  };

  const showSeekChip = showTimestamp && comment.timestampMs > 0;

  return (
    <div
      className={`flex gap-2.5 py-2 ${isReply ? 'pl-10' : ''} ${isExiting ? 'comment-row-exit' : ''}`}
      onAnimationEnd={(e) => {
        if (isExiting && e.target === e.currentTarget) onDelete?.(comment.id);
      }}
    >
      <img
        src={user.avatar_url ?? undefined}
        alt=""
        role="button"
        tabIndex={0}
        onClick={handleProfileClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleProfileClick();
          }
        }}
        style={{ width: avatarSize, height: avatarSize }}
        className="rounded-full bg-muted shrink-0 object-cover cursor-pointer hover:ring-2 hover:ring-primary/50"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleProfileClick} className="text-sm font-medium truncate hover:underline">
            {user.username}
          </button>
          <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(comment.createdAt, t)}</span>
        </div>
        <p className="text-sm text-foreground/90 break-words whitespace-pre-wrap mt-0.5">{linkifyText(comment.body)}</p>
        {(onReply || showSeekChip || canDelete) && (
          <div className="flex items-center gap-2 mt-1">
            {onReply && (
              <button
                type="button"
                onClick={onReply}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Reply className="h-3 w-3" />
                {t('comments.reply')}
              </button>
            )}
            {showSeekChip && (
              <button
                type="button"
                onClick={handleSeek}
                aria-label={t('comments.seekTo', { time: formatDuration(comment.timestampMs) })}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary hover:bg-primary/20 transition-colors"
              >
                <Play className="h-3 w-3 fill-current" />
                {formatDuration(comment.timestampMs)}
              </button>
            )}
            {canDelete && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  aria-label={t('comments.delete')}
                  className="inline-flex items-center text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <ConfirmDialog
                  open={confirmOpen}
                  onOpenChange={setConfirmOpen}
                  title={t('comments.deleteConfirmTitle')}
                  description={t('comments.deleteConfirmBody')}
                  confirmLabel={t('comments.delete')}
                  onConfirm={() => {
                    setConfirmOpen(false);
                    setIsExiting(true);
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
