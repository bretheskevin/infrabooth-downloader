import { useState, type ReactNode } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayOverlayProps {
  onPlay: () => void;
  onPause?: () => void;
  isPlaying?: boolean;
  children: ReactNode;
  className?: string;
}

export function PlayOverlay({ onPlay, onPause, isPlaying, children, className }: PlayOverlayProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying && onPause) {
      onPause();
    } else {
      onPlay();
    }
  };

  return (
    <div
      className={cn('relative group', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {(isHovered || isPlaying) && (
        <div
          data-testid="play-overlay-icon"
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-md bg-black/40 transition-opacity duration-150 cursor-pointer',
            isHovered ? 'opacity-100' : 'opacity-60',
          )}
          onClick={handleClick}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-white fill-white" />
          ) : (
            <Play className="h-4 w-4 text-white fill-white" />
          )}
        </div>
      )}
    </div>
  );
}
