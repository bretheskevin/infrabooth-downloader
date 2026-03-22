import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/format';
import { getArtworkUrl } from '@/lib/soundcloud';
import { EqualizerBars } from './EqualizerBars';
import { PlayOverlay } from './PlayOverlay';
import type { PlaybackItem } from '../types';

interface QueuePanelItemProps {
  item: PlaybackItem;
  index: number;
  isCurrent: boolean;
  onPlay: (index: number) => void;
  onPause: () => void;
  onResume: () => void;
  onRemove: (index: number) => void;
  isPlayerPlaying: boolean;
}

export function QueuePanelItem({ item, index, isCurrent, onPlay, onPause, onResume, onRemove, isPlayerPlaying }: QueuePanelItemProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.trackId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isRowHovered, setIsRowHovered] = useState(false);
  const handleMouseEnter = useCallback(() => setIsRowHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsRowHovered(false), []);

  const handlePlayPause = useCallback(() => {
    if (isCurrent && isPlayerPlaying) {
      onPause();
    } else if (isCurrent && !isPlayerPlaying) {
      onResume();
    } else {
      onPlay(index);
    }
  }, [isCurrent, isPlayerPlaying, onPause, onResume, onPlay, index]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-current={isCurrent || undefined}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md cursor-grab',
        isCurrent && 'bg-primary/5',
        isDragging && 'opacity-50 cursor-grabbing',
      )}
      onClick={handlePlayPause}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="h-6 w-6 flex items-center justify-center text-muted-foreground"
        aria-hidden="true"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {isCurrent ? (
        <Music className="h-3 w-3 text-primary flex-shrink-0" aria-hidden="true" />
      ) : (
        <span className="text-[10px] text-muted-foreground w-3 text-center flex-shrink-0">
          {index + 1}
        </span>
      )}

      <PlayOverlay
        onPlay={handlePlayPause}
        onPause={handlePlayPause}
        isActive={isCurrent}
        isPlaying={isCurrent && isPlayerPlaying}
        forceShow={isRowHovered}
        className="h-7 w-7 shrink-0"
      >
        <div className="h-7 w-7 rounded bg-secondary flex-shrink-0 overflow-hidden">
          {item.artworkUrl ? (
            <img src={getArtworkUrl(item.artworkUrl) ?? undefined} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <Music className="h-3 w-3" />
            </div>
          )}
        </div>
      </PlayOverlay>

      <div className="flex-1 min-w-0">
        <div className={cn('text-[11px] truncate', isCurrent ? 'font-semibold text-primary' : 'font-medium')}>
          {item.title}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">{item.artist}</div>
      </div>

      <span className="text-[10px] text-muted-foreground tabular-nums">{formatDuration(item.durationMs)}</span>

      {isCurrent ? (
        <EqualizerBars className="h-6 w-6" />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => { e.stopPropagation(); onRemove(index); }}
          aria-label={t('player.removeFromQueue')}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
