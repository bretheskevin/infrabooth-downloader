import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { RemoteState, RemoteCommand } from '@/lib/remote-protocol';
import { t } from '@remote/lib/i18n';
import QueueItem from './QueueItem';

interface Props {
  state: RemoteState | null;
  send: (cmd: RemoteCommand) => void;
  language: string;
}

export default function QueueList({ state, send, language }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  if (!state || state.queue.length === 0) {
    return <div className="p-6 text-center text-muted-foreground">{t('emptyQueue', language)}</div>;
  }

  const queue = state.queue;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      send({ type: 'reorderQueue', fromIndex: Number(active.id), toIndex: Number(over.id) });
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={queue.map((_, i) => i)} strategy={verticalListSortingStrategy}>
        <ul>
          {queue.map((track, index) => (
            <QueueItem
              key={index}
              track={track}
              index={index}
              isCurrent={index === state.cursor}
              showPlayMarker={index === state.cursor && state.state === 'playing'}
              onSkip={(i) => send({ type: 'skipTo', index: i })}
              onRemove={(i) => send({ type: 'removeFromQueue', index: i })}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
