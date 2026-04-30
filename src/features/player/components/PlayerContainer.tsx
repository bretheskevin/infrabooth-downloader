import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useIsWidescreen } from "@/hooks/useIsWidescreen";
import { usePlayerStore } from "../store";
import { MiniPill } from "./MiniPill";
import { ExpandedBar } from "./ExpandedBar";
import { QueuePanel } from "./QueuePanel";

const QUEUE_ANIMATION_MS = 250;

export function PlayerContainer() {
  const isWidescreen = useIsWidescreen();
  const { state, isExpanded, isQueueOpen } = usePlayerStore(
    useShallow((s) => ({
      state: s.state,
      isExpanded: s.isExpanded,
      isQueueOpen: s.isQueueOpen,
    })),
  );

  const prevWidescreen = useRef(false);
  useEffect(() => {
    if (isWidescreen && !prevWidescreen.current && isQueueOpen) {
      usePlayerStore.getState().toggleQueue();
    }
    prevWidescreen.current = isWidescreen;
  }, [isWidescreen, isQueueOpen]);

  const queueWasOpen = useRef(false);
  const [mountQueue, setMountQueue] = useState(false);
  const [queueClosing, setQueueClosing] = useState(false);

  useEffect(() => {
    if (isQueueOpen) {
      queueWasOpen.current = true;
      setMountQueue(true);
      setQueueClosing(false);
    } else if (queueWasOpen.current) {
      queueWasOpen.current = false;
      setQueueClosing(true);
      const timer = setTimeout(() => {
        setMountQueue(false);
        setQueueClosing(false);
      }, QUEUE_ANIMATION_MS);
      return () => clearTimeout(timer);
    }
  }, [isQueueOpen]);

  if (state === "stopped" || isWidescreen) return null;

  return (
    <>
      {isExpanded ? (
        <>
          {isQueueOpen && (
            <div
              className="fixed inset-0 z-30"
              onClick={() => usePlayerStore.getState().toggleQueue()}
            />
          )}
          {mountQueue && <QueuePanel closing={queueClosing} />}
          <ExpandedBar />
        </>
      ) : (
        <MiniPill />
      )}
    </>
  );
}
