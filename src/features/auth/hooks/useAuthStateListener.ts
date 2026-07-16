import { useEffect } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { logger } from '@/lib/logger';
import { getErrorString } from '@/lib/utils';
import { type AuthData, useAuthStore } from '@/features/auth/store';
import { listProfiles } from '@/features/auth/api';

/**
 * Hook to listen for auth state changes from the backend.
 * When the user signs in or out, the Rust backend emits an 'auth-state-changed' event
 * with the new auth state. This hook updates the Zustand auth store accordingly.
 *
 * Also listens for 'auth-reauth-needed' events, which are emitted when token
 * refresh fails and the user needs to sign in again.
 *
 * Also listens for 'auth-profile-selection-needed' events, which are emitted when
 * 2+ browser profiles are logged in and no valid remembered key was passed.
 */
export function useAuthStateListener(): void {
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    let unlistenAuthState: UnlistenFn | undefined;
    let unlistenReauthNeeded: UnlistenFn | undefined;
    let unlistenProfileSelection: UnlistenFn | undefined;
    let mounted = true;

    const setupListeners = async () => {
      try {
        unlistenAuthState = await listen<AuthData>('auth-state-changed', (event) => {
          void logger.debug(`[useAuthStateListener] Received auth-state-changed: ${JSON.stringify(event.payload)}`);
          if (mounted && event.payload) {
            setAuth(event.payload);
          }
        });

        unlistenReauthNeeded = await listen('auth-reauth-needed', () => {
          if (mounted) {
            clearAuth();
          }
        });

        unlistenProfileSelection = await listen('auth-profile-selection-needed', async () => {
          if (!mounted) return;
          const { setProfiles, openPicker, closePicker } = useAuthStore.getState();
          openPicker();
          try {
            const profiles = await listProfiles();
            setProfiles(profiles);
          } catch (error) {
            closePicker();
            void logger.error(`Failed to list profiles: ${getErrorString(error)}`);
          }
        });
      } catch (error) {
        void logger.error(`Failed to setup auth listeners: ${getErrorString(error)}`);
      }
    };

    setupListeners();

    return () => {
      mounted = false;
      if (unlistenAuthState) {
        unlistenAuthState();
      }
      if (unlistenReauthNeeded) {
        unlistenReauthNeeded();
      }
      if (unlistenProfileSelection) {
        unlistenProfileSelection();
      }
    };
  }, [setAuth, clearAuth]);
}
