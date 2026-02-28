import { useEffect } from 'react';
import { useUpdateStore } from '../store';

export function useUpdateCheck() {
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates);
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const updateInfo = useUpdateStore((s) => s.updateInfo);
  const checkInProgress = useUpdateStore((s) => s.checkInProgress);

  useEffect(() => {
    // Fire and forget — don't block rendering
    checkForUpdates();
  }, [checkForUpdates]);

  return { updateAvailable, updateInfo, isChecking: checkInProgress };
}
