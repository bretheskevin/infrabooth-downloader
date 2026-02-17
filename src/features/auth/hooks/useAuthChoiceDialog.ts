import { useCallback, useEffect, useState } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { commands } from '@/bindings';
import { startOAuth } from '../api';
import { useAuthStore } from '../store';

interface DownloadAuthNeededEvent {
  trackTitle: string;
}

interface AuthChoiceDialogState {
  isOpen: boolean;
  trackTitle: string | null;
}

export function useAuthChoiceDialog() {
  const [state, setState] = useState<AuthChoiceDialogState>({
    isOpen: false,
    trackTitle: null,
  });
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let mounted = true;

    const setupListener = async () => {
      unlisten = await listen<DownloadAuthNeededEvent>(
        'download-auth-needed',
        (event) => {
          if (mounted && event.payload) {
            setState({
              isOpen: true,
              trackTitle: event.payload.trackTitle,
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

  useEffect(() => {
    if (waitingForAuth && isSignedIn) {
      commands.respondToAuthChoice('re_authenticated');
      setState({ isOpen: false, trackTitle: null });
      setWaitingForAuth(false);
    }
  }, [waitingForAuth, isSignedIn]);

  const handleReAuthenticate = useCallback(async () => {
    setWaitingForAuth(true);
    setState((prev) => ({ ...prev, isOpen: false }));
    try {
      await startOAuth();
    } catch (error) {
      console.error('[useAuthChoiceDialog] OAuth start failed:', error);
      setWaitingForAuth(false);
      await commands.respondToAuthChoice('continue_standard');
    }
  }, []);

  const handleContinueStandard = useCallback(async () => {
    setState({ isOpen: false, trackTitle: null });
    await commands.respondToAuthChoice('continue_standard');
  }, []);

  return {
    isOpen: state.isOpen,
    trackTitle: state.trackTitle,
    handleReAuthenticate,
    handleContinueStandard,
  };
}
