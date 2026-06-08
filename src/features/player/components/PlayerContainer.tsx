import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useIsWidescreen } from '@/hooks/useIsWidescreen';
import { useAnimatedMount } from '@/hooks/useAnimatedMount';
import { usePlayerStore } from '../store';
import { MiniPill } from './MiniPill';
import { ExpandedBar } from './ExpandedBar';
import { QueuePanel } from './QueuePanel';
import { CommentsSheet } from './CommentsSheet';

const QUEUE_ANIMATION_MS = 250;

export function PlayerContainer() {
  const isWidescreen = useIsWidescreen();
  const { state, isExpanded, isQueueOpen, isCommentsOpen } = usePlayerStore(
    useShallow((s) => ({
      state: s.state,
      isExpanded: s.isExpanded,
      isQueueOpen: s.isQueueOpen,
      isCommentsOpen: s.isCommentsOpen,
    })),
  );

  const prevWidescreen = useRef(false);
  useEffect(() => {
    if (isWidescreen && !prevWidescreen.current) {
      if (isQueueOpen) usePlayerStore.getState().toggleQueue();
      if (isCommentsOpen) usePlayerStore.getState().toggleComments();
    }
    prevWidescreen.current = isWidescreen;
  }, [isWidescreen, isQueueOpen, isCommentsOpen]);

  const { mounted: mountQueue, closing: queueClosing } = useAnimatedMount(isQueueOpen, QUEUE_ANIMATION_MS);
  const { mounted: mountComments, closing: commentsClosing } = useAnimatedMount(isCommentsOpen, QUEUE_ANIMATION_MS);

  if (state === 'stopped' || isWidescreen) return null;

  return (
    <>
      {isExpanded ? (
        <>
          {isQueueOpen && <div className="fixed inset-0 z-30" onClick={() => usePlayerStore.getState().toggleQueue()} />}
          {mountQueue && <QueuePanel closing={queueClosing} />}
          {isCommentsOpen && <div className="fixed inset-0 z-30" onClick={() => usePlayerStore.getState().toggleComments()} />}
          {mountComments && <CommentsSheet closing={commentsClosing} />}
          <ExpandedBar />
        </>
      ) : (
        <MiniPill />
      )}
    </>
  );
}
