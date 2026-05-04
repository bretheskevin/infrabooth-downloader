import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/date';
import type { ReleaseActivityItem } from '@/bindings';
import { getReleaseMeta } from '../utils/release-meta';
import { ReleaseArtwork } from './ReleaseArtwork';

interface ReleaseCardProps {
  item: ReleaseActivityItem;
  onClick: () => void;
}

export function ReleaseCard({ item, onClick }: ReleaseCardProps) {
  const { t } = useTranslation();
  const { artworkUrl, typeLabel, isRepost, activityLabel } = getReleaseMeta(item, t, 300);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-stretch overflow-hidden rounded-lg border border-border bg-muted/50 text-left transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative aspect-square bg-muted">
        <ReleaseArtwork artworkUrl={artworkUrl} title={item.release.title} fallbackClassName="text-2xl" />
        <span className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded">
          {typeLabel}
        </span>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent backdrop-blur-[2px] px-2 pb-1.5 pt-4">
          <p className="text-white text-xs font-semibold truncate">{item.release.title}</p>
          <p className="text-white/70 text-[10px]">{t('newReleases.trackCount', { count: item.release.track_count })}</p>
        </div>
      </div>
      <div className="px-2 py-1.5">
        <p className={cn('text-[10px]', isRepost ? 'text-orange-500' : 'text-muted-foreground')}>
          {isRepost ? '↻ ' : ''}
          {activityLabel}
          {' · '}
          {formatRelativeTime(item.created_at, t)}
        </p>
      </div>
    </button>
  );
}
