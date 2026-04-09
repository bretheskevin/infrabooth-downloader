import { getArtworkUrl } from '@/lib/soundcloud';

interface PlaylistArtworkProps {
  artworkUrl: string | null;
  title: string;
  size?: 'sm' | 'lg';
}

const sizeClasses = {
  sm: 'w-14 h-14 rounded-md text-lg',
  lg: 'w-full h-full text-2xl',
} as const;

export function PlaylistArtwork({ artworkUrl, title, size = 'sm' }: PlaylistArtworkProps) {
  const resolvedUrl = getArtworkUrl(artworkUrl, 300);
  const classes = sizeClasses[size];

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={title}
        className={`${classes} object-cover shrink-0`}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`${classes} bg-muted flex items-center justify-center text-muted-foreground font-bold shrink-0`}>
      {title.charAt(0).toUpperCase()}
    </div>
  );
}
