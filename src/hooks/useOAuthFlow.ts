import { useCallback } from 'react';
import { completeOAuth } from '@/lib/auth';
import { useAuthCallback } from './useAuthCallback';

/**
 * Hook that connects the OAuth callback from deep links to the OAuth completion flow.
 * When the app receives an auth callback with an authorization code,
 * this hook automatically calls completeOAuth to exchange the code for tokens.
 *
 * @example
 * ```tsx
 * function App() {
 *   useOAuthFlow();
 *   return <AppContent />;
 * }
 * ```
 */
export function useOAuthFlow(): void {
  const handleCallback = useCallback(async (code: string) => {
    try {
      console.log('[useOAuthFlow] Received code, calling completeOAuth...');
      await completeOAuth(code);
      console.log('[useOAuthFlow] completeOAuth succeeded');
    } catch (error) {
      console.error('[useOAuthFlow] OAuth completion failed:', error);
    }
  }, []);

  useAuthCallback(handleCallback);
}
