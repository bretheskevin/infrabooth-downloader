import { useTranslation } from 'react-i18next';
import { useArtistProfileStore } from '@/features/artist-profile/store';
import { formatCount } from '@/lib/format';
import type { UserSearchResult } from '@/bindings';

interface ArtistSearchResultItemProps {
  artist: UserSearchResult;
}

export function ArtistSearchResultItem({ artist }: ArtistSearchResultItemProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    useArtistProfileStore.getState().openProfile(artist.id, artist.username);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-3 w-full px-2 py-2.5 text-left border-b border-border/50 last:border-b-0 hover:bg-secondary/50 transition-colors"
    >
      {artist.avatar_url ? (
        <img
          src={artist.avatar_url}
          alt={artist.username}
          className="h-10 w-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-muted-foreground">
            {artist.username.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate">{artist.username}</span>
        <span className="text-xs text-muted-foreground">
          <span>{t('search.followers', { value: formatCount(artist.followers_count) })}</span>
          {' · '}
          <span>{t('search.tracks', { value: formatCount(artist.track_count) })}</span>
        </span>
      </div>
    </button>
  );
}
