import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '@/features/settings/store';
import { usePlayContext } from '@/features/player';
import { SearchBar } from '@/components/ui/search-bar';
import { SearchFolderPicker } from './SearchFolderPicker';
import { SearchResultList } from './SearchResultList';
import { useSearchQuery } from '../hooks/useSearchQuery';
import { usePlayerControls } from '@/hooks/usePlayerControls';
import { useTrackPreloadHandlers } from '@/hooks/useTrackPreloadHandlers';
import { useTrackDownloadState } from '@/hooks/useTrackDownloadState';

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

  const [scanKey, setScanKey] = useState(0);
  const prevInputRef = useRef(inputValue);
  useEffect(() => {
    if (prevInputRef.current !== inputValue) {
      prevInputRef.current = inputValue;
      setScanKey((k) => k + 1);
    }
  }, [inputValue]);

  const { downloadTrack, getTrackState } = useTrackDownloadState({
    tracks: results.length > 0 ? results : undefined,
    downloadPath,
    enabled: results.length > 0,
    extraRefreshKey: scanKey,
  });

  const { playTrack } = usePlayContext(results);
  const { handlePreloadOnHover: handleHoverTrack, handlePreloadImmediate: handleMouseDownTrack } = useTrackPreloadHandlers();
  const { currentTrackId, isPlaying, pause: playerPause, resume: playerResume } = usePlayerControls();

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
          isPlayerPlaying={isPlaying}
          onHoverTrack={handleHoverTrack}
          onMouseDownTrack={handleMouseDownTrack}
        />
      </div>
    </div>
  );
}
