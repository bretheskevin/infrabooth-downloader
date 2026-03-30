import { useTranslation } from 'react-i18next';
import { Repeat2, Sparkles } from 'lucide-react';
import { formatRelativeTime } from '@/lib/date';
import type { ActivityType } from '@/bindings';

interface ActivityBadgeProps {
  activityType: ActivityType;
  createdAt: string;
}

export function ActivityBadge({ activityType, createdAt }: ActivityBadgeProps) {
  const { t } = useTranslation();
  const isRepost = activityType === 'Repost';
  const timeAgo = formatRelativeTime(createdAt, t);

  return (
    <p className="flex items-center gap-1 text-[11px] text-muted-foreground/70 truncate">
      {isRepost ? (
        <>
          <Repeat2 className="h-2.5 w-2.5 text-orange-500 shrink-0" />
          <span className="text-orange-500">{t('newTracks.repost')}</span>
        </>
      ) : (
        <>
          <Sparkles className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
          <span className="text-emerald-500">{t('newTracks.newTrack')}</span>
        </>
      )}
      <span>&middot;</span>
      <span>{timeAgo}</span>
    </p>
  );
}
