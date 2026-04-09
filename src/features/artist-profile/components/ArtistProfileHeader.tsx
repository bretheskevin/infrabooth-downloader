import { useRef, useState } from 'react';
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
  followButton?: React.ReactNode;
}

export function ArtistProfileHeader({
  profile,
  isLoading,
  isDownloadEnabled = false,
  showOrderToggle = false,
  actions,
  followButton,
}: ArtistProfileHeaderProps) {
  const { t } = useTranslation();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  const updateScrollIndicators = (el: HTMLElement) => {
    setCanScrollUp(el.scrollTop > 0);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  };

  const handleDescriptionExpand = () => {
    const willExpand = !isDescriptionExpanded;
    setIsDescriptionExpanded(willExpand);
    if (willExpand) {
      requestAnimationFrame(() => {
        if (descRef.current) updateScrollIndicators(descRef.current);
      });
    }
  };

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
            <div className="relative">
              {isDescriptionExpanded && canScrollUp && (
                <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
              )}
              <p
                ref={descRef}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (window.getSelection()?.toString()) return;
                  handleDescriptionExpand();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDescriptionExpand();
                  }
                }}
                onScroll={(e) => updateScrollIndicators(e.currentTarget)}
                className={cn(
                  'text-xs text-muted-foreground mt-0.5 cursor-pointer hover:text-foreground/80 transition-colors whitespace-pre-line',
                  isDescriptionExpanded ? 'max-h-32 overflow-y-auto' : 'line-clamp-3',
                )}
              >
                {linkifyDescription(profile.description)}
              </p>
              {isDescriptionExpanded && canScrollDown && (
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
              )}
            </div>
          )}
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{formatCount(profile.followers_count)}</strong>{' '}
              {t('artistProfile.followers')}
            </span>
            <span>
              <strong className="text-foreground">{formatCount(profile.track_count)}</strong>{' '}
              {t('artistProfile.tracks')}
            </span>
            {followButton}
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
