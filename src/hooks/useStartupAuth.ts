import { useEffect } from 'react';
import { checkAuthState } from '@/lib/auth';

/**
 * Hook to check authentication state on app startup.
 *
 * This hook calls the backend to check if valid tokens are stored,
 * and handles token refresh if needed. The auth state is automatically
 * propagated through the 'auth-state-changed' event.
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

    const checkAuth = async () => {
      try {
        await checkAuthState();
      } catch (error) {
        if (mounted) {
          console.error('Failed to check auth state on startup:', error);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);
}
