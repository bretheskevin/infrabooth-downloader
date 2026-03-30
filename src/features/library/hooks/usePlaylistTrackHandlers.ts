import { useCallback } from 'react';
import type { TrackInfo } from '@/bindings';
import { useDownloadSelected } from '@/hooks/useDownloadSelected';

interface UsePlaylistTrackHandlersParams {
  tracks: TrackInfo[] | undefined;
  playlistTitle: string;
  effectivePath: string | undefined;
  selectedTracks: TrackInfo[];
  downloadTrack: (track: TrackInfo) => void;
  clearSelection: () => void;
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function usePlaylistTrackHandlers({
  tracks,
  playlistTitle,
  effectivePath,
  selectedTracks,
  downloadTrack,
  clearSelection,
  onDownloadTracks,
}: UsePlaylistTrackHandlersParams) {
  const handleDownloadAll = useCallback(() => {
    if (tracks && tracks.length > 0) onDownloadTracks(tracks, playlistTitle, effectivePath);
  }, [tracks, playlistTitle, onDownloadTracks, effectivePath]);

  const handleDownloadSelected = useDownloadSelected(
    selectedTracks, clearSelection, onDownloadTracks, playlistTitle, effectivePath,
  );

  const handleDownloadTrack = useCallback(
    (track: TrackInfo) => downloadTrack(track),
    [downloadTrack],
  );

  return {
    handleDownloadAll,
    handleDownloadSelected,
    handleDownloadTrack,
  };
}
