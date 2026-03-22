import { useState, useMemo, useEffect } from 'react';
import { getFolderName } from '@/lib/utils';
import { useSettingsStore } from '@/features/settings';
import { useTrackDownloadState } from '@/hooks/useTrackDownloadState';
import { filterTracks } from '../utils/filterTracks';
import { sortTracks } from '../utils/sortTracks';
import type { TrackInfo } from '@/bindings';
import type { SortDirection, SortField } from '../types';

export function usePlaylistViewState(
  playlistId: number,
  tracks: TrackInfo[] | undefined,
  isStreaming: boolean,
) {
  const [searchQuery, setSearchQuery] = useState('');
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
  }, [playlistId]);

  const filteredTracks = useMemo(
    () => filterTracks(tracks ?? [], searchQuery),
    [tracks, searchQuery],
  );

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
