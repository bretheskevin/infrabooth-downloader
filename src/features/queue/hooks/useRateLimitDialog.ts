import { useCallback, useEffect, useState } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { commands } from '@/bindings';

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

export function useRateLimitDialog() {
  const [state, setState] = useState<RateLimitDialogState>({
    isOpen: false,
    trackTitle: null,
    resetTime: null,
  });

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let mounted = true;

    const setupListener = async () => {
      unlisten = await listen<DownloadRateLimitedEvent>(
        'download-rate-limited',
        (event) => {
          if (mounted && event.payload) {
            setState({
              isOpen: true,
              trackTitle: event.payload.trackTitle,
              resetTime: event.payload.resetTime,
            });
          }
        }
      );
    };

    setupListener();

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, []);

  const handleRetry = useCallback(async () => {
    setState({ isOpen: false, trackTitle: null, resetTime: null });
    await commands.respondToRateLimitChoice('retry');
  }, []);

  const handleStop = useCallback(async () => {
    setState({ isOpen: false, trackTitle: null, resetTime: null });
    await commands.respondToRateLimitChoice('stop');
  }, []);

  return {
    isOpen: state.isOpen,
    trackTitle: state.trackTitle,
    resetTime: state.resetTime,
    handleRetry,
    handleStop,
  };
}
