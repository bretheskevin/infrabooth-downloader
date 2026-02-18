import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArtworkThumbnailProps {
  src: string | null;
  alt: string;
  testIdPrefix: string;
  className?: string;
}

export function ArtworkThumbnail({ src, alt, testIdPrefix, className }: ArtworkThumbnailProps) {
  return (
    <div className={cn('flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-20 h-20 rounded-xl object-cover"
          data-testid={`${testIdPrefix}-artwork`}
        />
      ) : (
        <div
          className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center"
          data-testid={`${testIdPrefix}-artwork-placeholder`}
        >
          <Music className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
