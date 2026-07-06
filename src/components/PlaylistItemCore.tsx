import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaylistItemCoreProps {
  artworkUrl: string | null;
  title: string;
  titleAddon?: React.ReactNode;
  subtitle: React.ReactNode;
  artworkClassName?: string;
  children?: React.ReactNode;
}

export function PlaylistItemCore({
  artworkUrl,
  title,
  titleAddon,
  subtitle,
  artworkClassName = 'w-12 h-12 rounded-md',
  children,
}: PlaylistItemCoreProps) {
  return (
    <>
      <div className="flex-shrink-0">
        {artworkUrl ? (
          <img src={artworkUrl} alt={title} className={cn('object-cover', artworkClassName)} />
        ) : (
          <div
            className={cn('bg-secondary flex items-center justify-center', artworkClassName)}
            data-testid="playlist-item-artwork-placeholder"
          >
            <Music className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {titleAddon ? (
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium truncate min-w-0">{title}</p>
            {titleAddon}
          </div>
        ) : (
          <p className="text-sm font-medium truncate min-w-0">{title}</p>
        )}
        {subtitle}
      </div>
      {children}
    </>
  );
}
