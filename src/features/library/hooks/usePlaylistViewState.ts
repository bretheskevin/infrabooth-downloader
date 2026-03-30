import { useState, useMemo, useEffect } from 'react';
import { getFolderName } from '@/lib/utils';
import { useSettingsStore } from '@/features/settings';
import { useTrackDownloadState } from '@/hooks/useTrackDownloadState';
import { useSearchFilter } from '@/hooks/useSearchFilter';
import { sortTracks } from '../utils/sortTracks';
import type { TrackInfo } from '@/bindings';
import type { SortField } from '../types';
import type { SortDirection } from '@/lib/sort';

export function usePlaylistViewState(
  playlistId: number,
  tracks: TrackInfo[] | undefined,
  isStreaming: boolean,
) {
  const { searchQuery, setSearchQuery, filteredTracks } = useSearchFilter(tracks ?? []);
  const [sortField, setSortField] = useState<SortField>('default');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const defaultPath = useSettingsStore((s) => s.downloadPath);
  const [localPath, setLocalPath] = useState<string | undefined>(undefined);
  const effectivePath = localPath || defaultPath || undefined;

  const { downloadTrack, getTrackState, downloadedIds, downloadedCount } = useTrackDownloadState({
    tracks,
    downloadPath: effectivePath ?? '',
    enabled: !isStreaming,
  });

  useEffect(() => {
    setSearchQuery('');
    setSortField('default');
    setSortDirection('asc');
    setLocalPath(undefined);
  }, [playlistId, setSearchQuery]);

  const displayTracks = useMemo(
    () => sortTracks(filteredTracks, sortField, sortDirection),
    [filteredTracks, sortField, sortDirection],
  );

  const folderName = useMemo(
    () => (effectivePath ? getFolderName(effectivePath) : undefined),
    [effectivePath],
  );
  const isCustomFolder = Boolean(localPath && localPath !== defaultPath);

  return {
    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    localPath,
    setLocalPath,
    effectivePath,
    folderName,
    isCustomFolder,
    displayTracks,
    getTrackState,
    downloadedCount,
    downloadedIds,
    downloadTrack,
  };
}
