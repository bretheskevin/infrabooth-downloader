import { useTranslation } from 'react-i18next';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsSignedIn, useAuthStore } from '@/features/auth/store';
import { useFollowArtist } from '../hooks/useFollowArtist';

interface FollowButtonProps {
  artistId: number;
  artistUsername: string | undefined;
}

export function FollowButton({ artistId, artistUsername }: FollowButtonProps) {
  const { t } = useTranslation();
  const isSignedIn = useIsSignedIn();
  const currentUsername = useAuthStore((s) => s.username);
  const { isFollowing, isLoading, isChecking, toggle } = useFollowArtist(artistId);

  if (!isSignedIn) return null;
  if (artistUsername && currentUsername && artistUsername === currentUsername) return null;

  const showSpinner = isLoading || isChecking;

  return (
    <Button variant={isFollowing ? 'default' : 'secondary'} size="pill" onClick={toggle} disabled={showSpinner} className="shadow-none">
      {showSpinner ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="h-3.5 w-3.5" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      {isFollowing ? t('artistProfile.following') : t('artistProfile.follow')}
    </Button>
  );
}
