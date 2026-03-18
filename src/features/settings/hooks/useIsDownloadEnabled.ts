import { useSettingsStore } from '../store';

export function useIsDownloadEnabled(): boolean {
  return useSettingsStore((s) => !s.streamMode);
}
