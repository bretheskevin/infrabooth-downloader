import { cn } from '@/lib/utils';

interface ReleaseArtworkProps {
  artworkUrl: string | null;
  title: string;
  className?: string;
  fallbackClassName?: string;
}

export function ReleaseArtwork({ artworkUrl, title, className, fallbackClassName }: ReleaseArtworkProps) {
  if (artworkUrl) {
    return (
      <img
        src={artworkUrl}
        alt={title}
        className={cn('h-full w-full object-cover', className)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center font-bold text-muted-foreground',
        fallbackClassName,
      )}
    >
      {title.charAt(0).toUpperCase()}
    </div>
  );
}
