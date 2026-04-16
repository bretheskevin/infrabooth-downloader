import { cn } from '@/lib/utils';
import { useArtistProfileStore } from '@/features/artist-profile/store';

interface ArtistLinkProps {
  userId: number | null;
  username: string;
  className?: string;
}

export function ArtistLink({ userId, username, className }: ArtistLinkProps) {
  if (userId == null || userId <= 0) {
    return <span className={className}>{username}</span>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    useArtistProfileStore.getState().openProfile(userId, username);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn('hover:underline hover:text-foreground text-left', className)}
    >
      {username}
    </button>
  );
}
