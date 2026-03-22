import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { getErrorString } from '@/lib/utils';
import { checkAuth } from '@/features/auth/api';

/**
 * Hook to check authentication state on app startup.
 *
 * This hook scans browser cookies for a SoundCloud oauth_token,
 * verifies it against the API, and caches the result.
 * The auth state is automatically propagated through the 'auth-state-changed' event.
 *
 * Should be called once at the top level of the app (e.g., in App.tsx).
 *
 * @example
 * ```tsx
 * function App() {
 *   useStartupAuth();
 *   useAuthStateListener();
 *   return <AppContent />;
 * }
 * ```
 */
export function useStartupAuth(): void {
  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        await checkAuth();
      } catch (error) {
        if (mounted) {
          void logger.error(`Failed to check auth state on startup: ${getErrorString(error)}`);
        }
      }
    };

    check();

    return () => {
      mounted = false;
    };
  }, []);
}
