import type { NotificationItem } from '@/bindings';
import { AffiliationRow } from './renderers/AffiliationRow';
import { TrackActivityRow } from './renderers/TrackActivityRow';
import { PlaylistActivityRow } from './renderers/PlaylistActivityRow';

interface NotificationRowProps {
  item: NotificationItem;
  onClose: () => void;
}

export function NotificationRow({ item, onClose }: NotificationRowProps) {
  switch (item.kind) {
    case 'affiliation':
      return <AffiliationRow item={item} onClose={onClose} />;
    case 'track_like':
    case 'track_repost':
    case 'comment':
    case 'mention':
      return <TrackActivityRow item={item} onClose={onClose} />;
    case 'playlist_like':
    case 'playlist_repost':
      return <PlaylistActivityRow item={item} onClose={onClose} />;
    default:
      return null;
  }
}
