import { useEffect } from 'react';

export function useWakeLock(): void {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const acquire = async () => {
      if (disposed || document.visibilityState !== 'visible') return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (disposed) {
          void next.release();
          return;
        }
        sentinel = next;
      } catch {
        // denied (battery saver, insecure context): the screen may sleep
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      sentinel?.release().catch(() => {
        // already released by the browser when the page was hidden
      });
    };
  }, []);
}
