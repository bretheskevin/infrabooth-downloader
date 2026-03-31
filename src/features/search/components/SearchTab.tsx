import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { SearchBar } from '@/components/ui/search-bar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SearchResultList } from './SearchResultList';
import { ArtistSearchResultList } from './ArtistSearchResultList';
import { SearchFolderPicker } from './SearchFolderPicker';
import { useSearchQuery } from '../hooks/useSearchQuery';
import { useArtistSearchQuery } from '../hooks/useArtistSearchQuery';
import { useSearchStore, type SearchType } from '../store';
import { useSettingsStore, useIsDownloadEnabled } from '@/features/settings';
import { useTrackDownloadState } from '@/hooks/useTrackDownloadState';
import { usePlayContext } from '@/features/player';
import { TrackListProvider } from '@/components/InteractiveTrackRow';

export function SearchTab() {
  const { t } = useTranslation();
  const { searchType, inputValue } = useSearchStore(
    useShallow((s) => ({ searchType: s.searchType, inputValue: s.inputValue })),
  );
  const { setSearchType, setInputValue } = useSearchStore.getState();
  const defaultPath = useSettingsStore((s) => s.downloadPath);
  const [downloadPath, setDownloadPath] = useState(defaultPath);
  const isDownloadEnabled = useIsDownloadEnabled();

  useEffect(() => {
    setDownloadPath(defaultPath);
  }, [defaultPath]);

  const trackSearch = useSearchQuery();
  const artistSearch = useArtistSearchQuery();

  const [scanKey, setScanKey] = useState(0);
  const prevInputRef = useRef(inputValue);
  useEffect(() => {
    if (prevInputRef.current !== inputValue) {
      prevInputRef.current = inputValue;
      setScanKey((k) => k + 1);
    }
  }, [inputValue]);

  const { downloadTrack, downloadedIds } = useTrackDownloadState({
    tracks: trackSearch.results.length > 0 ? trackSearch.results : undefined,
    downloadPath,
    enabled: trackSearch.results.length > 0,
    extraRefreshKey: scanKey,
  });

  const { playTrack } = usePlayContext(trackSearch.results);

  const placeholder = searchType === 'tracks'
    ? t('search.placeholder')
    : t('search.placeholderArtists');

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <SearchBar value={inputValue} onChange={setInputValue} placeholder={placeholder} autoFocus />
      <Tabs
        value={searchType}
        onValueChange={(v) => setSearchType(v as SearchType)}
        className="flex flex-col flex-1 min-h-0 gap-3"
      >
        <div className="flex items-center justify-between pr-3">
          <TabsList variant="underline">
            <TabsTrigger value="tracks" className="text-xs px-2 py-1">
              {t('search.tabTracks')}
            </TabsTrigger>
            <TabsTrigger value="artists" className="text-xs px-2 py-1">
              {t('search.tabArtists')}
            </TabsTrigger>
          </TabsList>
          {searchType === 'tracks' && (
            <SearchFolderPicker path={downloadPath} onPathChange={setDownloadPath} />
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <TabsContent value="tracks" className="mt-0">
            <TrackListProvider
              playTrack={playTrack}
              downloadTrack={downloadTrack}
              isDownloadEnabled={isDownloadEnabled}
              downloadVariant="filled"
              downloadedIds={downloadedIds}
            >
              <SearchResultList
                results={trackSearch.results}
                isLoading={trackSearch.isLoading}
                isFetchingNextPage={trackSearch.isFetchingNextPage}
                hasNextPage={trackSearch.hasNextPage}
                fetchNextPage={trackSearch.fetchNextPage}
                error={trackSearch.error}
                hasSearched={trackSearch.hasSearched}
                isUrlMode={trackSearch.isUrlMode}
              />
            </TrackListProvider>
          </TabsContent>
          <TabsContent value="artists" className="mt-0">
            <ArtistSearchResultList
              results={artistSearch.results}
              isLoading={artistSearch.isLoading}
              isFetchingNextPage={artistSearch.isFetchingNextPage}
              hasNextPage={artistSearch.hasNextPage}
              fetchNextPage={artistSearch.fetchNextPage}
              error={artistSearch.error}
              hasSearched={artistSearch.hasSearched}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
