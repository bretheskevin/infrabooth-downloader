import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getArtworkUrl } from '@/lib/soundcloud';
import { formatRelativeTime } from '@/lib/date';
import type { ReleaseActivityItem } from '@/bindings';
import { RELEASE_TYPE_KEYS } from '../constants';

interface ReleaseCardProps {
  item: ReleaseActivityItem;
  onClick: () => void;
}

export function ReleaseCard({ item, onClick }: ReleaseCardProps) {
  const { t } = useTranslation();
  const artworkUrl = getArtworkUrl(item.release.artwork_url, 300);
  const typeLabel = t(RELEASE_TYPE_KEYS[item.release.release_type]);
  const isRepost = item.activity_type === 'Repost';

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="rounded-lg overflow-hidden bg-muted/50 border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors text-left h-auto p-0 w-full flex-col items-stretch"
    >
      <div className="relative aspect-square bg-muted">
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt={item.release.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl font-bold">
            {item.release.title.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded">
          {typeLabel}
        </span>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent backdrop-blur-[2px] px-2 pb-1.5 pt-4">
          <p className="text-white text-xs font-semibold truncate">{item.release.title}</p>
          <p className="text-white/70 text-[10px]">
            {t('newReleases.trackCount', { count: item.release.track_count })}
          </p>
        </div>
      </div>
      <div className="px-2 py-1.5">
        <p className={cn('text-[10px]', isRepost ? 'text-orange-500' : 'text-muted-foreground')}>
          {isRepost ? '↻ ' : ''}
          {t(isRepost ? 'newReleases.reposted' : 'newReleases.new')}
          {' · '}
          {formatRelativeTime(item.created_at, t)}
        </p>
      </div>
    </Button>
  );
}
