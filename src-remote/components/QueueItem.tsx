import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { RemoteTrack } from '@/lib/remote-protocol';
import { cn } from '@/lib/utils';

const SWIPE_THRESHOLD = 80;
const MOVE_TOLERANCE = 6;

interface Props {
  track: RemoteTrack;
  index: number;
  isCurrent: boolean;
  showPlayMarker: boolean;
  onSkip: (index: number) => void;
  onRemove: (index: number) => void;
}

export default function QueueItem({ track, index, isCurrent, showPlayMarker, onSkip, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: index });
  const [swipeX, setSwipeX] = useState(0);
  const startXRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  const artworkUrl = track.artworkUrl?.replace('-large', '-t50x50') ?? null;

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    movedRef.current = false;
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (startXRef.current === null || isDragging) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > MOVE_TOLERANCE) movedRef.current = true;
    setSwipeX(Math.min(0, dx));
  }

  function handlePointerUp() {
    if (startXRef.current === null) return;
    if (!isDragging && swipeX <= -SWIPE_THRESHOLD) onRemove(index);
    setSwipeX(0);
    startXRef.current = null;
  }

  function handleGripPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    listeners?.onPointerDown?.(e);
  }

  function handleClick() {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    onSkip(index);
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative overflow-hidden', isDragging && 'z-10 opacity-90')}
    >
      <div className="absolute inset-0 flex items-center justify-end px-5 bg-destructive text-destructive-foreground">
        <Trash2 className="size-5" />
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        style={{ transform: `translateX(${swipeX}px)`, touchAction: 'pan-y' }}
        className={cn(
          'relative flex items-center gap-3 px-4 py-3 cursor-pointer',
          isCurrent ? 'bg-secondary' : 'bg-card',
          swipeX === 0 && 'transition-transform',
        )}
      >
        {artworkUrl ? (
          <img src={artworkUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded flex-shrink-0 bg-secondary" />
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('truncate text-sm font-medium', isCurrent ? 'text-primary' : 'text-foreground')}>
            {showPlayMarker ? '▶ ' : ''}
            {track.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
        </div>
        <button
          {...attributes}
          {...listeners}
          onPointerDown={handleGripPointerDown}
          onClick={(e) => e.stopPropagation()}
          aria-label="reorder"
          className="flex items-center justify-center h-9 w-9 flex-shrink-0 text-muted-foreground touch-none cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="size-5" />
        </button>
      </div>
    </li>
  );
}
