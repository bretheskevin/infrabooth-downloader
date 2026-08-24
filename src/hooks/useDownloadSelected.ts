import { useCallback } from 'react';
import type { TrackInfo } from '@/bindings';

export function useDownloadSelected(
  selectedTracks: TrackInfo[],
  clearSelection: () => void,
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>,
  title: string,
  outputDir?: string,
) {
  return useCallback(async () => {
    if (selectedTracks.length === 0) {
      clearSelection();
      return;
    }
    await onDownloadTracks(selectedTracks, title, outputDir);
    clearSelection();
  }, [selectedTracks, title, outputDir, onDownloadTracks, clearSelection]);
}
