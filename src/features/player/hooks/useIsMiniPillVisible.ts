import { usePlayerStore } from '../store';

export function useIsMiniPillVisible() {
  return usePlayerStore((s) => !s.isExpanded && s.state !== 'stopped' && s.currentTrack !== null);
}
