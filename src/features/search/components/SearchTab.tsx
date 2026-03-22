import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { useSettingsStore } from '@/features/settings/store';
import { usePlayContext, usePlayerStore } from '@/features/player';
import { preloadOnHover, preloadImmediate } from '@/features/player/url-cache';
import { useDownloadedTracks } from '@/features/library/hooks/useDownloadedTracks';
import { SearchBar } from '@/components/ui/search-bar';
import { SearchFolderPicker } from './SearchFolderPicker';
import { SearchResultList } from './SearchResultList';
import { useSearchQuery } from '../hooks/useSearchQuery';
import { useTrackDownload, useMergedTrackState } from '@/hooks';

export function SearchTab() {
  const { t } = useTranslation();
  const defaultPath = useSettingsStore((s) => s.downloadPath);
  const [downloadPath, setDownloadPath] = useState(defaultPath);

  useEffect(() => {
    setDownloadPath(defaultPath);
  }, [defaultPath]);

  const {
    inputValue,
    handleInputChange,
    results,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    hasSearched,
  } = useSearchQuery();

  const { downloadTrack, getTrackState: getRawTrackState, completedCount: inlineCompletedCount, reconcile } = useTrackDownload(downloadPath);

  // Bump scan key on every input change so filesystem is re-scanned even for cached results
  const [scanKey, setScanKey] = useState(0);
  const prevInputRef = useRef(inputValue);
  useEffect(() => {
    if (prevInputRef.current !== inputValue) {
      prevInputRef.current = inputValue;
      setScanKey((k) => k + 1);
    }
  }, [inputValue]);

  const { downloadedIds } = useDownloadedTracks(results, downloadPath, results.length > 0, inlineCompletedCount + scanKey);

  const getTrackState = useMergedTrackState(getRawTrackState, downloadedIds, reconcile);

  const { playTrack } = usePlayContext(results);

  const handleHoverTrack = useCallback(
    (track: { id: number; permalink_url: string }) =>
      preloadOnHover(track.id, track.permalink_url),
    [],
  );

  const handleMouseDownTrack = useCallback(
    (track: { id: number; permalink_url: string }) =>
      preloadImmediate(track.id, track.permalink_url),
    [],
  );

  const { currentTrackId, playerState } = usePlayerStore(
    useShallow((s) => ({ currentTrackId: s.currentTrack?.trackId, playerState: s.state }))
  );
  const playerPause = useCallback(() => usePlayerStore.getState().pause(), []);
  const playerResume = useCallback(() => usePlayerStore.getState().resume(), []);

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <SearchBar value={inputValue} onChange={handleInputChange} placeholder={t('search.placeholder')} autoFocus />
      <SearchFolderPicker path={downloadPath} onPathChange={setDownloadPath} />
      <div className="flex-1 min-h-0 overflow-y-auto pr-8">
        <SearchResultList
          results={results}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          error={error}
          hasSearched={hasSearched}
          getTrackState={getTrackState}
          onDownload={downloadTrack}
          onRetry={downloadTrack}
          onPlayTrack={playTrack}
          onPauseTrack={playerPause}
          onResumeTrack={playerResume}
          currentlyPlayingId={currentTrackId}
          isPlayerPlaying={playerState === 'playing'}
          onHoverTrack={handleHoverTrack}
          onMouseDownTrack={handleMouseDownTrack}
        />
      </div>
    </div>
  );
}
