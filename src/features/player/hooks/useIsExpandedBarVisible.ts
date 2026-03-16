import { usePlayerStore } from '../store';

/** Whether the expanded player bar is currently visible on screen. */
export function useIsExpandedBarVisible() {
  return usePlayerStore((s) => s.isExpanded && s.state !== 'stopped');
}
