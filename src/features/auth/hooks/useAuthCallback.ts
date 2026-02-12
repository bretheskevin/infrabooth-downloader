import { useEffect, useCallback } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

/**
 * Hook to listen for OAuth callback events from the deep link handler.
 * When the app receives a deep link URL (ib-downloader://auth/callback?code=...),
 * the Rust backend extracts the code and emits an 'auth-callback' event.
 *
 * @param onCallback - Function called with the authorization code when received
 *
 * @example
 * ```tsx
 * useAuthCallback((code) => {
 *   console.log('Received auth code:', code);
 *   // Exchange code for tokens...
 * });
 * ```
 */
export function useAuthCallback(onCallback: (code: string) => void): void {
  const stableCallback = useCallback(onCallback, [onCallback]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let mounted = true;

    const setupListener = async () => {
      try {
        unlisten = await listen<string>('auth-callback', (event) => {
          console.log('[useAuthCallback] Received auth-callback event:', event);
          if (mounted && event.payload) {
            console.log('[useAuthCallback] Calling callback with code:', event.payload.substring(0, 10) + '...');
            stableCallback(event.payload);
          } else {
            console.warn('[useAuthCallback] Event ignored - mounted:', mounted, 'payload:', event.payload);
          }
        });
        console.log('[useAuthCallback] Listener registered successfully');
      } catch (error) {
        console.error('Failed to setup auth-callback listener:', error);
      }
    };

    setupListener();

    return () => {
      mounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, [stableCallback]);
}
