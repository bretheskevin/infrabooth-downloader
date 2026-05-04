import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArtistAvatarImage } from '@/components/ArtistAvatarImage';
import { getArtworkUrl } from '@/lib/soundcloud';
import { formatCount } from '@/lib/format';
import type { ArtistProfile } from '@/bindings';

interface ArtistFollowRowProps {
  artist: ArtistProfile;
  onClick: () => void;
}

export function ArtistFollowRow({ artist, onClick }: ArtistFollowRowProps) {
  const { t } = useTranslation();
  const avatarUrl = getArtworkUrl(artist.avatar_url, 67);

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="h-auto w-full justify-start gap-3 px-3 py-2 font-normal rounded-lg hover:bg-accent/60"
    >
      <ArtistAvatarImage avatarUrl={avatarUrl} username={artist.username} className="w-10 h-10 shrink-0" />
      <div className="flex flex-col items-start min-w-0 flex-1 gap-0.5">
        <span className="text-sm font-semibold text-foreground truncate max-w-full">{artist.username}</span>
        <span className="text-xs text-muted-foreground">
          {formatCount(artist.track_count)} {t('artistProfile.tracks')}
        </span>
      </div>
      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
        {formatCount(artist.followers_count)} {t('artistProfile.followers')}
      </span>
    </Button>
  );
}
