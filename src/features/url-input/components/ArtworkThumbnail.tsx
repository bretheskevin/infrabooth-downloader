import { Music } from 'lucide-react';

interface ArtworkThumbnailProps {
  src: string | null;
  alt: string;
  testIdPrefix: string;
}

export function ArtworkThumbnail({ src, alt, testIdPrefix }: ArtworkThumbnailProps) {
  return (
    <div className="flex-shrink-0">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-16 h-16 rounded-md object-cover"
          data-testid={`${testIdPrefix}-artwork`}
        />
      ) : (
        <div
          className="w-16 h-16 rounded-md bg-muted flex items-center justify-center"
          data-testid={`${testIdPrefix}-artwork-placeholder`}
        >
          <Music className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
