import { useCallback, useMemo } from 'react';
import { commands } from '@/bindings';
import { useTauriEventDialog } from '@/hooks/useTauriEventDialog';

interface DownloadRateLimitedEvent {
  trackId: string;
  trackTitle: string;
  resetTime: string | null;
}

interface RateLimitDialogState {
  isOpen: boolean;
  trackTitle: string | null;
  resetTime: string | null;
}

const INITIAL_STATE: RateLimitDialogState = {
  isOpen: false,
  trackTitle: null,
  resetTime: null,
};

export function useRateLimitDialog() {
  const mapPayload = useMemo(
    () =>
      (payload: DownloadRateLimitedEvent): RateLimitDialogState => ({
        isOpen: true,
        trackTitle: payload.trackTitle,
        resetTime: payload.resetTime,
      }),
    [],
  );

  const { state, close } = useTauriEventDialog<DownloadRateLimitedEvent, RateLimitDialogState>(
    'download-rate-limited',
    mapPayload,
    INITIAL_STATE,
  );

  const handleRetry = useCallback(async () => {
    close(INITIAL_STATE);
    await commands.respondToRateLimitChoice('retry');
  }, [close]);

  const handleStop = useCallback(async () => {
    close(INITIAL_STATE);
    await commands.respondToRateLimitChoice('stop');
  }, [close]);

  return {
    isOpen: state.isOpen,
    trackTitle: state.trackTitle,
    resetTime: state.resetTime,
    handleRetry,
    handleStop,
  };
}
