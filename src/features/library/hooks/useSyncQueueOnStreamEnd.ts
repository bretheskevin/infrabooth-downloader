import { useEffect, useRef } from 'react';

export function useSyncQueueOnStreamEnd(
  isStreaming: boolean,
  currentTrackId: number | undefined,
  syncQueue: () => void,
) {
  const wasStreamingRef = useRef(false);

  useEffect(() => {
    const wasStreaming = wasStreamingRef.current;
    wasStreamingRef.current = isStreaming;

    if (wasStreaming && !isStreaming && currentTrackId) {
      syncQueue();
    }
  }, [isStreaming, currentTrackId, syncQueue]);
}
