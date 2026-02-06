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

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let mounted = true;

    const setupListener = async () => {
      try {
        unlisten = await listen<AuthStatePayload>('auth-state-changed', (event) => {
          if (mounted && event.payload) {
            setAuth(event.payload.isSignedIn, event.payload.username);
          }
        });
      } catch (error) {
        console.error('Failed to setup auth-state-changed listener:', error);
      }
    };

    setupListener();

    return () => {
      mounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, [setAuth]);
}
