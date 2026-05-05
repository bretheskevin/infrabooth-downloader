import type { NotificationItem } from '@/bindings';
import { AffiliationRow } from './renderers/AffiliationRow';
import { TrackActivityRow } from './renderers/TrackActivityRow';
import { PlaylistActivityRow } from './renderers/PlaylistActivityRow';

interface NotificationRowProps {
  item: NotificationItem;
  onClose: () => void;
  variant?: 'compact' | 'widescreen';
}

export function NotificationRow({ item, onClose, variant }: NotificationRowProps) {
  switch (item.kind) {
    case 'affiliation':
      return <AffiliationRow item={item} onClose={onClose} variant={variant} />;
    case 'track_like':
    case 'track_repost':
    case 'comment':
    case 'mention':
      return <TrackActivityRow item={item} onClose={onClose} variant={variant} />;
    case 'playlist_like':
    case 'playlist_repost':
      return <PlaylistActivityRow item={item} onClose={onClose} variant={variant} />;
    default:
      return null;
  }
}
