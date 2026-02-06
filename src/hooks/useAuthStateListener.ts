import { useEffect } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useAuthStore } from '@/stores/authStore';

interface AuthStatePayload {
  isSignedIn: boolean;
  username: string | null;
}

/**
 * Hook to listen for auth state changes from the backend.
 * When the user signs in or out, the Rust backend emits an 'auth-state-changed' event
 * with the new auth state. This hook updates the Zustand auth store accordingly.
 *
 * Also listens for 'auth-reauth-needed' events, which are emitted when token
 * refresh fails and the user needs to sign in again.
 *
 * @example
 * ```tsx
 * function App() {
 *   useAuthStateListener();
 *   return <AppContent />;
 * }
 * ```
 */
export function useAuthStateListener(): void {
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    let unlistenAuthState: UnlistenFn | undefined;
    let unlistenReauthNeeded: UnlistenFn | undefined;
    let mounted = true;

    const setupListeners = async () => {
      try {
        // Listen for auth state changes
        unlistenAuthState = await listen<AuthStatePayload>('auth-state-changed', (event) => {
          if (mounted && event.payload) {
            setAuth(event.payload.isSignedIn, event.payload.username);
          }
        });

        // Listen for re-authentication needed events (token refresh failed)
        unlistenReauthNeeded = await listen('auth-reauth-needed', () => {
          if (mounted) {
            clearAuth();
            // Future: Could show a toast or notification here
          }
        });
      } catch (error) {
        console.error('Failed to setup auth listeners:', error);
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
    };
  }, [setAuth, clearAuth]);
}
