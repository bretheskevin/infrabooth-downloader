import { cn } from '@/lib/utils';

interface ArtistAvatarImageProps {
  avatarUrl: string | null;
  username: string;
  className?: string;
}

export function ArtistAvatarImage({ avatarUrl, username, className }: ArtistAvatarImageProps) {
  return (
    <div className={cn('rounded-full bg-muted overflow-hidden', className)}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-medium">
          {username.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
