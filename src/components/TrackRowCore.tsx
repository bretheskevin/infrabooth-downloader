import { cn } from '@/lib/utils';

interface TrackRowCoreProps {
  title: string;
  artist: React.ReactNode;
  isCurrent: boolean;
  artistPrefix?: React.ReactNode;
  subtitleSlot?: React.ReactNode;
  children?: React.ReactNode;
}

export function TrackRowCore({ title, artist, isCurrent, artistPrefix, subtitleSlot, children }: TrackRowCoreProps) {
  return (
    <div className="flex-1 min-w-0">
      <p className={cn('text-sm font-medium truncate', isCurrent ? 'text-primary' : 'text-foreground')}>{title}</p>
      <div className="flex items-center gap-1 min-w-0">
        {artistPrefix}
        {typeof artist === 'string' ? <p className="text-xs text-muted-foreground truncate">{artist}</p> : artist}
      </div>
      {subtitleSlot}
      {children}
    </div>
  );
}
