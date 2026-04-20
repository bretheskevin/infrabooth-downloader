import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount } from '@/lib/format';
import { ExpandableDescription } from './ExpandableDescription';
import type { ArtistProfile } from '@/bindings';

interface ArtistProfileHeaderProps {
  profile: ArtistProfile | undefined;
  isLoading: boolean;
  actions?: React.ReactNode;
  followButton?: React.ReactNode;
}

export function ArtistProfileHeader({
  profile,
  isLoading,
  actions,
  followButton,
}: ArtistProfileHeaderProps) {
  const { t } = useTranslation();

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
            <ExpandableDescription description={profile.description} />
          )}
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{formatCount(profile.followers_count)}</strong>{' '}
              {t('artistProfile.followers')}
            </span>
            <span>
              <strong className="text-foreground">{formatCount(profile.followings_count)}</strong>{' '}
              {t('artistProfile.followings')}
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
    </div>
  );
}
