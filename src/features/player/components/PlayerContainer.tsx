import { usePlayerStore } from '../store';
import { usePlayerEvents } from '../hooks/usePlayerEvents';
import { MiniPill } from './MiniPill';
import { ExpandedBar } from './ExpandedBar';
import { QueuePanel } from './QueuePanel';

export function PlayerContainer() {
  usePlayerEvents();

  const state = usePlayerStore((s) => s.state);
  const isExpanded = usePlayerStore((s) => s.isExpanded);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);

  if (state === 'stopped') return null;

  return (
    <>
      {isExpanded ? (
        <>
          {isQueueOpen && <QueuePanel />}
          <ExpandedBar />
        </>
      ) : (
        <MiniPill />
      )}
    </>
  );
}
