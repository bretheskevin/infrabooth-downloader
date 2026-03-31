import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArtistAvatarImage } from '@/features/new-tracks/components/ArtistAvatarImage';
import { formatCount } from '@/lib/format';
import { getArtworkUrl } from '@/lib/soundcloud';
import { cn } from '@/lib/utils';
import { PreserveOrderToggle } from '@/components/PreserveOrderToggle';
import { linkifyDescription } from './LinkifiedDescription';
import type { ArtistProfile } from '@/bindings';

interface ArtistProfileHeaderProps {
  profile: ArtistProfile | undefined;
  isLoading: boolean;
  onDownloadAll: () => void;
  hasDownloadableTracks: boolean;
  isDownloadEnabled?: boolean;
  showOrderToggle?: boolean;
}

export function ArtistProfileHeader({
  profile,
  isLoading,
  onDownloadAll,
  hasDownloadableTracks,
  isDownloadEnabled = false,
  showOrderToggle = false,
}: ArtistProfileHeaderProps) {
  const { t } = useTranslation();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="flex items-start gap-3 pt-6 px-1">
          <Skeleton className="h-16 w-16 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const bannerUrl = profile.visuals?.visuals?.[0]?.visual_url ?? null;
  const avatarUrl = getArtworkUrl(profile.avatar_url ?? null, 200);

  return (
    <div className="space-y-0">
      <div className="relative h-24 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
        {bannerUrl && (
          <img src={bannerUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
        )}
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <ArtistAvatarImage
            avatarUrl={avatarUrl}
            username={profile.username}
            className="w-14 h-14 ring-2 ring-background shadow-lg"
          />
        </div>
      </div>

      <div className="pt-2 px-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{profile.username}</h2>
            {profile.description && (
              <p
                onClick={() => {
                  if (window.getSelection()?.toString()) return;
                  setIsDescriptionExpanded((prev) => !prev);
                }}
                className={cn(
                  'text-xs text-muted-foreground mt-0.5 cursor-pointer hover:text-foreground/80 transition-colors whitespace-pre-line',
                  !isDescriptionExpanded && 'line-clamp-2',
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

          {hasDownloadableTracks && (
            <Button size="sm" onClick={onDownloadAll} className="gap-1.5 shrink-0">
              <Download className="h-3.5 w-3.5" />
              {t('artistProfile.downloadAll')}
            </Button>
          )}
        </div>
        {isDownloadEnabled && showOrderToggle && (
          <div className="flex justify-end">
            <PreserveOrderToggle compact />
          </div>
        )}
      </div>
    </div>
  );
}
