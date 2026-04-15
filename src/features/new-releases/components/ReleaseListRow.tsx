import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/date';
import type { ReleaseActivityItem } from '@/bindings';
import { getReleaseMeta } from '../utils/release-meta';
import { ReleaseArtwork } from './ReleaseArtwork';

interface ReleaseListRowProps {
  item: ReleaseActivityItem;
  onClick: () => void;
}

export function ReleaseListRow({ item, onClick }: ReleaseListRowProps) {
  const { t } = useTranslation();
  const { artworkUrl, typeLabel, isRepost, activityLabel } = getReleaseMeta(item, t, 200);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
        <ReleaseArtwork artworkUrl={artworkUrl} title={item.release.title} fallbackClassName="text-lg" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {typeLabel}
          </span>
          <p className="truncate text-sm font-medium">{item.release.title}</p>
        </div>
        <p className={cn('truncate text-xs', isRepost ? 'text-orange-500' : 'text-muted-foreground')}>
          {isRepost ? '↻ ' : ''}
          {activityLabel}
          {' · '}
          {t('newReleases.trackCount', { count: item.release.track_count })}
          {' · '}
          {formatRelativeTime(item.created_at, t)}
        </p>
      </div>
    </button>
  );
}
