import { useTranslation } from 'react-i18next';
import { usePlayerStore, buildPlaybackQueue } from '@/features/player';
import type { NotificationItem } from '@/bindings';
import { formatRelativeTime } from '@/lib/date';
import { ClickableAvatar } from './ClickableAvatar';
import { NOTIFICATION_ROW_CLASS, NOTIFICATION_ROW_WIDESCREEN_CLASS, handleKeyActivate } from './styles';

type TrackItem = Extract<NotificationItem, { kind: 'track_like' | 'track_repost' | 'comment' | 'mention' }>;

interface TrackActivityRowProps {
  item: TrackItem;
  onClose: () => void;
  variant?: 'compact' | 'widescreen';
}

const LABEL_KEY: Record<TrackItem['kind'], string> = {
  track_like: 'notifications.label.track_like',
  track_repost: 'notifications.label.track_repost',
  comment: 'notifications.label.comment',
  mention: 'notifications.label.mention',
};

export function TrackActivityRow({ item, onClose, variant }: TrackActivityRowProps) {
  const { t } = useTranslation();
  const rowClass = variant === 'widescreen' ? NOTIFICATION_ROW_WIDESCREEN_CLASS : NOTIFICATION_ROW_CLASS;

  const handleTrackClick = () => {
    const queue = buildPlaybackQueue([item.track]);
    usePlayerStore.getState().play(queue, 0);
    onClose();
  };

  return (
    <div role="button" tabIndex={0} onClick={handleTrackClick} onKeyDown={handleKeyActivate(handleTrackClick)} className={rowClass}>
      <ClickableAvatar actor={item.actor} onClose={onClose} size={variant === 'widescreen' ? 42 : 32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{t(LABEL_KEY[item.kind], { actor: item.actor.username, track: item.track.title })}</p>
        {'body' in item && item.body && <p className="text-xs text-muted-foreground truncate">&ldquo;{item.body}&rdquo;</p>}
        <p className="text-xs text-muted-foreground">{formatRelativeTime(item.created_at, t)}</p>
      </div>
      {item.track.artwork_url && <img src={item.track.artwork_url} alt="" className="h-10 w-10 rounded bg-muted shrink-0 object-cover" />}
    </div>
  );
}
