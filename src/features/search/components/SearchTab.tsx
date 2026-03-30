import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '@/features/settings/store';
import { useIsDownloadEnabled } from '@/features/settings';
import { usePlayContext } from '@/features/player';
import { SearchBar } from '@/components/ui/search-bar';
import { TrackListProvider } from '@/components/InteractiveTrackRow';
import { SearchFolderPicker } from './SearchFolderPicker';
import { SearchResultList } from './SearchResultList';
import { useSearchQuery } from '../hooks/useSearchQuery';
import { useTrackDownloadState } from '@/hooks/useTrackDownloadState';

export function SearchTab() {
  const { t } = useTranslation();
  const defaultPath = useSettingsStore((s) => s.downloadPath);
  const [downloadPath, setDownloadPath] = useState(defaultPath);
  const isDownloadEnabled = useIsDownloadEnabled();

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
    isUrlMode,
  } = useSearchQuery();

  const [scanKey, setScanKey] = useState(0);
  const prevInputRef = useRef(inputValue);
  useEffect(() => {
    if (prevInputRef.current !== inputValue) {
      prevInputRef.current = inputValue;
      setScanKey((k) => k + 1);
    }
  }, [inputValue]);

  const { downloadTrack, downloadedIds } = useTrackDownloadState({
    tracks: results.length > 0 ? results : undefined,
    downloadPath,
    enabled: results.length > 0,
    extraRefreshKey: scanKey,
  });

  const { playTrack } = usePlayContext(results);

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <SearchBar value={inputValue} onChange={handleInputChange} placeholder={t('search.placeholder')} autoFocus />
      <SearchFolderPicker path={downloadPath} onPathChange={setDownloadPath} />
      <div className="flex-1 min-h-0 overflow-y-auto pr-8">
        <TrackListProvider
          playTrack={playTrack}
          downloadTrack={downloadTrack}
          isDownloadEnabled={isDownloadEnabled}
          downloadVariant="filled"
          downloadedIds={downloadedIds}
        >
          <SearchResultList
            results={results}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
            error={error}
            hasSearched={hasSearched}
            isUrlMode={isUrlMode}
          />
        </TrackListProvider>
      </div>
    </div>
  );
}
