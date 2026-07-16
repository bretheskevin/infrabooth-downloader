import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { getErrorString } from '@/lib/utils';
import { checkAuth } from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/store';

/**
 * Hook to check authentication state on app startup.
 *
 * Reads the persisted profile key from the auth store and passes it to
 * checkAuth so the backend can auto-connect the previously selected account.
 * Re-runs whenever the selected profile key changes (e.g., after switching accounts).
 *
 * The auth state is automatically propagated through the 'auth-state-changed' event.
 *
 * Should be called once at the top level of the app (e.g., in App.tsx).
 */
export function useStartupAuth(): void {
  const selectedProfileKey = useAuthStore((state) => state.selectedProfileKey);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        await checkAuth(selectedProfileKey);
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
  }, [selectedProfileKey]);
}
