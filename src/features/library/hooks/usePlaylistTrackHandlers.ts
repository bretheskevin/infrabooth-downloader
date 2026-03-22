import { useCallback } from 'react';
import type { TrackInfo } from '@/bindings';
import { useTrackPreloadHandlers } from '@/hooks/useTrackPreloadHandlers';

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

  const handleDownloadSelected = useCallback(async () => {
    await onDownloadTracks(selectedTracks, playlistTitle, effectivePath);
    clearSelection();
  }, [selectedTracks, playlistTitle, onDownloadTracks, clearSelection, effectivePath]);

  const { handlePreloadOnHover: handleHoverTrack, handlePreloadImmediate: handleMouseDownTrack } = useTrackPreloadHandlers();

  const handleDownloadTrack = useCallback(
    (track: TrackInfo) => downloadTrack(track),
    [downloadTrack],
  );

  return {
    handleDownloadAll,
    handleDownloadSelected,
    handleHoverTrack,
    handleMouseDownTrack,
    handleDownloadTrack,
  };
}
