import { useCallback, useMemo } from 'react';
import { commands } from '@/bindings';
import { logger } from '@/lib/logger';
import { getErrorString } from '@/lib/utils';
import { refreshAuth } from '../api';
import { useTauriEventDialog } from '@/hooks/useTauriEventDialog';

interface DownloadAuthNeededEvent {
  trackTitle: string;
}

interface AuthChoiceDialogState {
  isOpen: boolean;
  trackTitle: string | null;
}

const INITIAL_STATE: AuthChoiceDialogState = {
  isOpen: false,
  trackTitle: null,
};

export function useAuthChoiceDialog() {
  const mapPayload = useMemo(
    () => (payload: DownloadAuthNeededEvent): AuthChoiceDialogState => ({
      isOpen: true,
      trackTitle: payload.trackTitle,
    }),
    [],
  );

  const { state, close } = useTauriEventDialog<DownloadAuthNeededEvent, AuthChoiceDialogState>(
    'download-auth-needed',
    mapPayload,
    INITIAL_STATE,
  );

  const handleReAuthenticate = useCallback(async () => {
    close(INITIAL_STATE);
    try {
      const success = await refreshAuth();
      if (success) {
        await commands.respondToAuthChoice('re_authenticated');
      } else {
        await commands.respondToAuthChoice('continue_standard');
      }
    } catch (error) {
      void logger.error(`[useAuthChoiceDialog] Auth refresh failed: ${getErrorString(error)}`);
      await commands.respondToAuthChoice('continue_standard');
    }
  }, [close]);

  const handleContinueStandard = useCallback(async () => {
    close(INITIAL_STATE);
    await commands.respondToAuthChoice('continue_standard');
  }, [close]);

  return {
    isOpen: state.isOpen,
    trackTitle: state.trackTitle,
    handleReAuthenticate,
    handleContinueStandard,
  };
}
