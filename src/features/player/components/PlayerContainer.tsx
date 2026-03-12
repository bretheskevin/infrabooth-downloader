import { useEffect } from 'react';
import { usePlayerStore } from '../store';
import { usePlayerEvents } from '../hooks/usePlayerEvents';
import { MiniPill } from './MiniPill';
import { ExpandedBar } from './ExpandedBar';
import { QueuePanel } from './QueuePanel';

interface PlayerContainerProps {
  selectedCount?: number;
}

export function PlayerContainer({ selectedCount = 0 }: PlayerContainerProps) {
  usePlayerEvents();

  const state = usePlayerStore((s) => s.state);
  const isExpanded = usePlayerStore((s) => s.isExpanded);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const collapse = usePlayerStore((s) => s.collapse);

  // Auto-collapse when selection bar appears
  useEffect(() => {
    if (selectedCount > 0 && isExpanded) {
      collapse();
    }
  }, [selectedCount, isExpanded, collapse]);

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
