import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatDuration, getArtworkUrl } from '@/lib/utils';
import type { PlaybackItem } from '../types';

interface QueuePanelItemProps {
  item: PlaybackItem;
  index: number;
  isCurrent: boolean;
  onPlay: (index: number) => void;
  onRemove: (index: number) => void;
}

export function QueuePanelItem({ item, index, isCurrent, onPlay, onRemove }: QueuePanelItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md cursor-grab touch-none',
        isCurrent && 'bg-primary/5',
        isDragging && 'opacity-50',
      )}
      onClick={() => onPlay(index)}
    >

      {isCurrent ? (
        <Music className="h-3 w-3 text-primary flex-shrink-0" aria-hidden="true" />
      ) : (
        <span className="text-[10px] text-muted-foreground w-3 text-center flex-shrink-0">
          {index + 1}
        </span>
      )}

      <div className="h-7 w-7 rounded bg-secondary flex-shrink-0 overflow-hidden">
        {item.artworkUrl && (
          <img src={getArtworkUrl(item.artworkUrl) ?? undefined} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className={cn('text-[11px] truncate', isCurrent ? 'font-semibold text-primary' : 'font-medium')}>
          {item.title}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">{item.artist}</div>
      </div>

      <span className="text-[10px] text-muted-foreground tabular-nums">{formatDuration(item.durationMs)}</span>

      {!isCurrent && (
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
