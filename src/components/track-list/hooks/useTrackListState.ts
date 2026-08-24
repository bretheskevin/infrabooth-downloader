import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { TrackInfo } from '@/bindings';
import { useIsDownloadEnabled } from '@/features/settings/hooks/useIsDownloadEnabled';
import { useSearchFilter } from '@/hooks/useSearchFilter';
import { useTrackDownloadState } from '@/hooks/useTrackDownloadState';
import { useTrackSelection } from '@/hooks/useTrackSelection';
import { useRekordboxExclusionStore, useExcludedTrackIds } from '@/features/rekordbox-export/store';
import { useRekordboxDetection } from '@/features/rekordbox-export/hooks/useRekordboxDetection';
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
  playlistId?: string;
}

export function useTrackListState(config: UseTrackListStateConfig) {
  const isDownloadEnabled = useIsDownloadEnabled();
  const stableTracks = config.tracks ?? EMPTY_ARRAY;
  const { onDownloadTracks } = config.download;

  const folderState = useFolderPath(config.folder, config.playlistId);
  const { resetLocalPath } = folderState;
  const downloadPath = config.folder ? folderState.effectivePath : config.download.path;
  const handleOpenFolder = useOpenDownloadFolder(downloadPath ?? null);

  const { searchQuery, setSearchQuery, filteredTracks } = useSearchFilter(stableTracks);
  const showSearch = config.searchThreshold != null && stableTracks.length >= config.searchThreshold;

  useEffect(() => {
    setSearchQuery('');
    resetLocalPath();
  }, [config.resetKey, setSearchQuery, resetLocalPath]);

  const { downloadTrack, downloadedIds, downloadedCount } = useTrackDownloadState({
    tracks: stableTracks.length > 0 ? stableTracks : undefined,
    downloadPath: downloadPath ?? '',
    enabled: !config.isLoading,
  });

  const { data: rekordboxStatus } = useRekordboxDetection();
  const rekordboxAvailable = !rekordboxStatus || rekordboxStatus.found;
  const canExclude = config.playlistId != null && rekordboxAvailable;

  const excludedIds = useExcludedTrackIds(canExclude ? config.playlistId : undefined);

  const nonSelectableIds = useMemo(() => {
    if (!canExclude) return downloadedIds;
    const s = new Set<number>();
    for (const t of filteredTracks) if (downloadedIds.has(t.id) && excludedIds.has(t.id)) s.add(t.id);
    return s;
  }, [canExclude, downloadedIds, excludedIds, filteredTracks]);

  const { selectedIds, toggleTrack, toggleAll, clearSelection, selectedCount, isAllSelected, selectedTracks, selectableCount } =
    useTrackSelection(filteredTracks, nonSelectableIds);

  const downloadableSelected = useMemo(() => selectedTracks.filter((t) => !downloadedIds.has(t.id)), [selectedTracks, downloadedIds]);

  const handleExcludeSelected = useCallback(() => {
    if (!config.playlistId || selectedTracks.length === 0) return;
    const ids = selectedTracks.map((t) => t.id);
    useRekordboxExclusionStore.getState().excludeTracks(config.playlistId, ids);
    clearSelection();
  }, [config.playlistId, selectedTracks, clearSelection]);

  const { playTrack: rawPlayTrack, syncQueue, playShuffled: rawPlayShuffled } = usePlayContext(filteredTracks);

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

  const playShuffled = useCallback(() => {
    playedFromHereRef.current = true;
    rawPlayShuffled();
  }, [rawPlayShuffled]);

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

  const handleDownloadSelected = useDownloadSelected(downloadableSelected, clearSelection, onDownloadTracks, config.title, downloadPath);

  const prevCountRef = useRef(0);
  const shouldAnimate = prevCountRef.current === 0 && stableTracks.length > 0;
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
    playShuffled,
    shouldAnimate,
    handleExcludeSelected,
    canExclude,
    nonSelectableIds,
    folder: {
      effectivePath: downloadPath,
      folderName: folderState.folderName,
      isCustomFolder: folderState.isCustomFolder,
      handleChangeFolder: folderState.selectFolder,
      handleOpenFolder,
    },
  };
}
