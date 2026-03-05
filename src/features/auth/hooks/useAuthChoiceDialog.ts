import { useCallback, useEffect, useState } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { commands } from '@/bindings';
import { refreshAuth } from '../api';

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

  const handleReAuthenticate = useCallback(async () => {
    setState({ isOpen: false, trackTitle: null });
    try {
      const success = await refreshAuth();
      if (success) {
        await commands.respondToAuthChoice('re_authenticated');
      } else {
        await commands.respondToAuthChoice('continue_standard');
      }
    } catch (error) {
      console.error('[useAuthChoiceDialog] Auth refresh failed:', error);
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
