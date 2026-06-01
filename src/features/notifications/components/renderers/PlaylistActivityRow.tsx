import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import type { NotificationItem } from '@/bindings';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { useIsSignedIn } from '@/features/auth/store';
import { useLikePlaylist, type LikePlaylistInput } from '@/hooks/useLikePlaylist';
import { formatRelativeTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { useNotificationsStore } from '../../store';
import { ClickableAvatar } from './ClickableAvatar';
import { NOTIFICATION_ROW_CLASS, NOTIFICATION_ROW_WIDESCREEN_CLASS, handleKeyActivate } from './styles';

type PlaylistItem = Extract<NotificationItem, { kind: 'playlist_like' | 'playlist_repost' }>;

interface PlaylistActivityRowProps {
  item: PlaylistItem;
  onClose: () => void;
  variant?: 'compact' | 'widescreen';
}

const LABEL_KEY: Record<PlaylistItem['kind'], string> = {
  playlist_like: 'notifications.label.playlist_like',
  playlist_repost: 'notifications.label.playlist_repost',
};

function toLikeInput(item: PlaylistItem): LikePlaylistInput {
  return {
    id: item.playlist.id,
    title: item.playlist.title,
    artwork_url: item.playlist.artwork_url,
    permalink_url: item.playlist.permalink_url,
    track_count: item.playlist.track_count,
    username: item.playlist.user.username,
    user_id: item.playlist.user.id,
    duration: null,
  };
}

export function PlaylistActivityRow({ item, onClose, variant }: PlaylistActivityRowProps) {
  const { t } = useTranslation();
  const isSignedIn = useIsSignedIn();
  const rowClass = variant === 'widescreen' ? NOTIFICATION_ROW_WIDESCREEN_CLASS : NOTIFICATION_ROW_CLASS;

  const likeState = useLikePlaylist(isSignedIn ? toLikeInput(item) : undefined);

  const handlePlaylistClick = () => {
    useNotificationsStore.getState().openPlaylist(item.playlist);
    onClose();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={handlePlaylistClick}
          onKeyDown={handleKeyActivate(handlePlaylistClick)}
          className={rowClass}
        >
          <ClickableAvatar actor={item.actor} onClose={onClose} size={variant === 'widescreen' ? 42 : 32} />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{t(LABEL_KEY[item.kind], { actor: item.actor.username, playlist: item.playlist.title })}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(item.created_at, t)}</p>
          </div>
          {item.playlist.artwork_url && (
            <img src={item.playlist.artwork_url} alt="" className="h-10 w-10 rounded bg-muted shrink-0 object-cover" />
          )}
        </div>
      </ContextMenuTrigger>
      {likeState && (
        <ContextMenuContent>
          <ContextMenuItem onClick={likeState.onToggle} disabled={likeState.isLoading}>
            <Heart className={cn('mr-2 h-4 w-4', likeState.isLiked && 'fill-primary text-primary')} />
            {t(likeState.isLiked ? 'playlistMenu.unlike' : 'playlistMenu.like')}
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
