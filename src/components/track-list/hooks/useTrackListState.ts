import { useCallback, useEffect, useRef } from 'react';
import type { TrackInfo } from '@/bindings';
import { useIsDownloadEnabled } from '@/features/settings/hooks/useIsDownloadEnabled';
import { useSearchFilter } from '@/hooks/useSearchFilter';
import { useTrackDownloadState } from '@/hooks/useTrackDownloadState';
import { useTrackSelection } from '@/hooks/useTrackSelection';
import { usePlayContext } from '@/features/player/hooks/usePlayContext';
import { useDownloadSelected } from '@/hooks/useDownloadSelected';
import { usePlayerStore } from '@/features/player/store';
import { useFolderPath } from '@/hooks/useFolderPath';
import { useOpenDownloadFolder } from '@/hooks/useOpenDownloadFolder';
import type { DownloadConfig } from '../types';

const EMPTY_ARRAY: TrackInfo[] = [];

interface UseTrackListStateConfig {
  tracks: TrackInfo[] | undefined;
  isLoading: boolean;
  isStreaming?: boolean;
  title: string;
  download: DownloadConfig;
  folder?: boolean;
  searchThreshold?: number;
  resetKey?: string | number;
}

export function useTrackListState(config: UseTrackListStateConfig) {
  const isDownloadEnabled = useIsDownloadEnabled();
  const stableTracks = config.tracks ?? EMPTY_ARRAY;
  const { onDownloadTracks } = config.download;

  const folderState = useFolderPath(config.folder);
  const { resetLocalPath } = folderState;
  const downloadPath = config.folder ? folderState.effectivePath : config.download.path;
  const handleOpenFolder = useOpenDownloadFolder(downloadPath ?? null);

  const { searchQuery, setSearchQuery, filteredTracks } = useSearchFilter(stableTracks);
  const showSearch = config.searchThreshold != null && stableTracks.length >= config.searchThreshold;

  useEffect(() => {
    setSearchQuery('');
    resetLocalPath();
  }, [config.resetKey, setSearchQuery, resetLocalPath]);

  const {
    downloadTrack,
    downloadedIds,
    downloadedCount,
  } = useTrackDownloadState({
    tracks: stableTracks.length > 0 ? stableTracks : undefined,
    downloadPath: downloadPath ?? '',
    enabled: !config.isLoading,
  });

  const {
    selectedIds,
    toggleTrack,
    toggleAll,
    clearSelection,
    selectedCount,
    isAllSelected,
    selectedTracks,
    selectableCount,
  } = useTrackSelection(filteredTracks, downloadedIds);

  const { playTrack: rawPlayTrack, syncQueue } = usePlayContext(filteredTracks);

  const playedFromHereRef = useRef(false);
  useEffect(() => {
    playedFromHereRef.current = false;
  }, [config.resetKey]);

  const playTrack = useCallback(
    (index: number) => {
      playedFromHereRef.current = true;
      rawPlayTrack(index);
    },
    [rawPlayTrack],
  );

  const wasStreamingRef = useRef(false);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.trackId);
  useEffect(() => {
    const wasStreaming = wasStreamingRef.current;
    wasStreamingRef.current = config.isStreaming ?? false;
    if (wasStreaming && !config.isStreaming && currentTrackId && playedFromHereRef.current) {
      syncQueue();
    }
  }, [config.isStreaming, currentTrackId, syncQueue]);

  const handleDownloadAll = useCallback(() => {
    if (stableTracks.length > 0) {
      onDownloadTracks(stableTracks, config.title, downloadPath);
    }
  }, [stableTracks, onDownloadTracks, config.title, downloadPath]);

  const handleDownloadSelected = useDownloadSelected(
    selectedTracks,
    clearSelection,
    onDownloadTracks,
    config.title,
    downloadPath,
  );

  const prevCountRef = useRef(0);
  const shouldAnimate = stableTracks.length > prevCountRef.current;
  useEffect(() => {
    prevCountRef.current = stableTracks.length;
  }, [stableTracks.length]);

  return {
    searchQuery,
    setSearchQuery,
    showSearch,
    displayTracks: filteredTracks,
    selectedIds,
    toggleTrack,
    toggleAll,
    clearSelection,
    selectedCount,
    isAllSelected,
    selectableCount,
    isDownloadEnabled,
    downloadTrack,
    downloadedIds,
    downloadedCount,
    handleDownloadAll,
    handleDownloadSelected,
    playTrack,
    shouldAnimate,
    folder: {
      effectivePath: downloadPath,
      folderName: folderState.folderName,
      isCustomFolder: folderState.isCustomFolder,
      handleChangeFolder: folderState.selectFolder,
      handleOpenFolder,
    },
  };
}
