import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getArtworkUrl } from '@/lib/soundcloud';
import { ArtistAvatarImage } from './ArtistAvatarImage';
import type { FollowedArtist } from '@/bindings';

interface ArtistAvatarProps {
  artist: FollowedArtist;
  isSelected?: boolean;
  onClick: () => void;
}

export function ArtistAvatar({ artist, isSelected, onClick }: ArtistAvatarProps) {
  const avatarUrl = getArtworkUrl(artist.avatar_url, 200);

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      aria-label={artist.username}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16 h-auto p-0 hover:bg-transparent"
    >
      <div className="relative">
        <ArtistAvatarImage
          avatarUrl={avatarUrl}
          username={artist.username}
          className={cn(
            'w-14 h-14 ring-2 ring-offset-2 ring-offset-background transition-all',
            isSelected ? 'ring-primary' : 'ring-transparent',
          )}
        />
        {artist.has_new_content && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full border-2 border-background" />
        )}
      </div>
      <span className={cn(
        'text-xs truncate w-full text-center',
        isSelected ? 'text-foreground font-medium' : 'text-muted-foreground',
      )}>
        {artist.username}
      </span>
    </Button>
  );
}
