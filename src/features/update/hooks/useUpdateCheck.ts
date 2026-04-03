import { useEffect } from 'react';
import { useUpdateStore } from '../store';

const POLL_INTERVAL_MS = 10 * 60 * 1000;

export function useUpdateCheck() {
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates);
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const updateInfo = useUpdateStore((s) => s.updateInfo);
  const checkInProgress = useUpdateStore((s) => s.checkInProgress);

  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  useEffect(() => {
    if (updateAvailable) return;

    const interval = setInterval(checkForUpdates, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkForUpdates, updateAvailable]);

  return { updateAvailable, updateInfo, isChecking: checkInProgress };
}
