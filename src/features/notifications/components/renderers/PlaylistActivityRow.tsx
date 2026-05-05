import { useTranslation } from 'react-i18next';
import { useNotificationsStore } from '../../store';
import type { NotificationItem } from '@/bindings';
import { formatRelativeTime } from '@/lib/date';
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

export function PlaylistActivityRow({ item, onClose, variant }: PlaylistActivityRowProps) {
  const { t } = useTranslation();
  const rowClass = variant === 'widescreen' ? NOTIFICATION_ROW_WIDESCREEN_CLASS : NOTIFICATION_ROW_CLASS;

  const handlePlaylistClick = () => {
    useNotificationsStore.getState().openPlaylist(item.playlist);
    onClose();
  };

  return (
    <div role="button" tabIndex={0} onClick={handlePlaylistClick} onKeyDown={handleKeyActivate(handlePlaylistClick)} className={rowClass}>
      <ClickableAvatar actor={item.actor} onClose={onClose} size={variant === 'widescreen' ? 42 : 32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{t(LABEL_KEY[item.kind], { actor: item.actor.username, playlist: item.playlist.title })}</p>
        <p className="text-xs text-muted-foreground">{formatRelativeTime(item.created_at, t)}</p>
      </div>
      {item.playlist.artwork_url && (
        <img src={item.playlist.artwork_url} alt="" className="h-10 w-10 rounded bg-muted shrink-0 object-cover" />
      )}
    </div>
  );
}
