import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PreserveOrderToggle } from '@/components/PreserveOrderToggle';
import { linkifyDescription } from './LinkifiedDescription';
import type { ArtistProfile } from '@/bindings';

interface ArtistProfileHeaderProps {
  profile: ArtistProfile | undefined;
  isLoading: boolean;
  isDownloadEnabled?: boolean;
  showOrderToggle?: boolean;
  actions?: React.ReactNode;
}

export function ArtistProfileHeader({
  profile,
  isLoading,
  isDownloadEnabled = false,
  showOrderToggle = false,
  actions,
}: ArtistProfileHeaderProps) {
  const { t } = useTranslation();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2 px-1">
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="px-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {profile.description && (
            <p
              onClick={() => {
                if (window.getSelection()?.toString()) return;
                setIsDescriptionExpanded((prev) => !prev);
              }}
              className={cn(
                'text-xs text-muted-foreground mt-0.5 cursor-pointer hover:text-foreground/80 transition-colors whitespace-pre-line',
                !isDescriptionExpanded && 'line-clamp-3',
              )}
            >
              {linkifyDescription(profile.description)}
            </p>
          )}
          <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{formatCount(profile.followers_count)}</strong>{' '}
              {t('artistProfile.followers')}
            </span>
            <span>
              <strong className="text-foreground">{formatCount(profile.track_count)}</strong>{' '}
              {t('artistProfile.tracks')}
            </span>
          </div>
        </div>
        {actions}
      </div>
      {isDownloadEnabled && showOrderToggle && (
        <div className={cn("flex justify-end", {"mt-3": (profile.description?.length ?? 0) <= 1})}>
          <PreserveOrderToggle compact />
        </div>
      )}
    </div>
  );
}
