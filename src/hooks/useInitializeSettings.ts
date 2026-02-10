import { useEffect, useRef } from 'react';
import { useSettingsStore, useSettingsHydrated } from '@/stores/settingsStore';
import { getDefaultDownloadPath, validateDownloadPath } from '@/lib/settings';

/**
 * Hook that initializes settings on app launch:
 * - First launch: Sets default download path from system
 * - Subsequent launches: Validates saved path, resets if invalid
 *
 * Returns { isInitialized, pathWasReset } for UI feedback
 */
export function useInitializeSettings() {
  const { downloadPath, setDownloadPath } = useSettingsStore();
  const isHydrated = useSettingsHydrated();
  const initializationRef = useRef(false);
  const pathWasResetRef = useRef(false);

  useEffect(() => {
    // Only run once after hydration
    if (!isHydrated || initializationRef.current) return;
    initializationRef.current = true;

    const initializePath = async () => {
      // First launch: no path set
      if (!downloadPath) {
        try {
          const defaultPath = await getDefaultDownloadPath();
          if (defaultPath) {
            setDownloadPath(defaultPath);
          }
        } catch (error) {
          console.error('Failed to get default download path:', error);
        }
        return;
      }

      // Subsequent launch: validate saved path
      const isValid = await validateDownloadPath(downloadPath);
      if (!isValid) {
        console.warn('Saved download path is invalid, resetting to default:', downloadPath);
        try {
          const defaultPath = await getDefaultDownloadPath();
          if (defaultPath) {
            setDownloadPath(defaultPath);
            pathWasResetRef.current = true;
          }
        } catch (error) {
          console.error('Failed to get default download path after validation failure:', error);
        }
      }
    };

    initializePath();
  }, [isHydrated, downloadPath, setDownloadPath]);

  return {
    isInitialized: isHydrated && initializationRef.current,
    pathWasReset: pathWasResetRef.current,
  };
}
