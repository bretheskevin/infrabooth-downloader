import { useSyncExternalStore } from 'react';

const WIDESCREEN_QUERY = '(min-width: 1200px)';

function subscribe(callback: () => void) {
  const mql = window.matchMedia(WIDESCREEN_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.matchMedia(WIDESCREEN_QUERY).matches;
}

export function useIsWidescreen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
