import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatDuration, getArtworkUrl } from '@/lib/utils';
import type { PlaybackItem } from '../types';

interface QueuePanelItemProps {
  item: PlaybackItem;
  index: number;
  isCurrent: boolean;
  onRemove: (index: number) => void;
}

export function QueuePanelItem({ item, index, isCurrent, onRemove }: QueuePanelItemProps) {
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
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md',
        isCurrent && 'bg-primary/5',
        isDragging && 'opacity-50',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-0.5 text-muted-foreground hover:text-foreground"
        aria-label={t('player.reorder')}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

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
          onClick={() => onRemove(index)}
          aria-label={t('player.removeFromQueue')}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
