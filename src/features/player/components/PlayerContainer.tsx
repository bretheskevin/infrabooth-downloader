import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../store';
import { usePlayerEvents } from '../hooks/usePlayerEvents';
import { MiniPill } from './MiniPill';
import { ExpandedBar } from './ExpandedBar';
import { QueuePanel } from './QueuePanel';

export function PlayerContainer() {
  usePlayerEvents();

  const { state, isExpanded, isQueueOpen } = usePlayerStore(
    useShallow((s) => ({ state: s.state, isExpanded: s.isExpanded, isQueueOpen: s.isQueueOpen }))
  );

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
