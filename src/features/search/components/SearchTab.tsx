import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { SearchBar } from '@/components/ui/search-bar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SearchResultList } from './SearchResultList';
import { ArtistSearchResultList } from './ArtistSearchResultList';
import { PlaylistSearchResultList } from './PlaylistSearchResultList';
import { SearchFolderPicker } from './SearchFolderPicker';
import { useSearchQuery } from '../hooks/useSearchQuery';
import { useArtistSearchQuery } from '../hooks/useArtistSearchQuery';
import { usePlaylistSearchQuery } from '../hooks/usePlaylistSearchQuery';
import { useAlbumSearchQuery } from '../hooks/useAlbumSearchQuery';
import { useSearchStore, type SearchType } from '../store';
import { useSettingsStore, useIsDownloadEnabled } from '@/features/settings';
import { useTrackDownloadState } from '@/hooks/useTrackDownloadState';
import { usePlayContext } from '@/features/player';
import { TrackListProvider } from '@/components/InteractiveTrackRow';

export function SearchTab() {
  const { t } = useTranslation();
  const { searchType, inputValue } = useSearchStore(useShallow((s) => ({ searchType: s.searchType, inputValue: s.inputValue })));
  const { setSearchType, setInputValue } = useSearchStore.getState();
  const defaultPath = useSettingsStore((s) => s.downloadPath);
  const [downloadPath, setDownloadPath] = useState(defaultPath);
  const isDownloadEnabled = useIsDownloadEnabled();

  useEffect(() => {
    setDownloadPath(defaultPath);
  }, [defaultPath]);

  const trackSearch = useSearchQuery();
  const artistSearch = useArtistSearchQuery();
  const playlistSearch = usePlaylistSearchQuery();
  const albumSearch = useAlbumSearchQuery();

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

  const placeholder = {
    tracks: t('search.placeholder'),
    artists: t('search.placeholderArtists'),
    playlists: t('search.placeholderPlaylists'),
    albums: t('search.placeholderAlbums'),
  }[searchType];

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <SearchBar value={inputValue} onChange={setInputValue} placeholder={placeholder} autoFocus />
      <Tabs value={searchType} onValueChange={(v) => setSearchType(v as SearchType)} className="flex flex-col flex-1 min-h-0 gap-3">
        <div className="flex items-center justify-between pr-3">
          <TabsList variant="underline">
            <TabsTrigger value="tracks" className="text-xs px-2 py-1">
              {t('search.tabTracks')}
            </TabsTrigger>
            <TabsTrigger value="artists" className="text-xs px-2 py-1">
              {t('search.tabArtists')}
            </TabsTrigger>
            <TabsTrigger value="playlists" className="text-xs px-2 py-1">
              {t('search.tabPlaylists')}
            </TabsTrigger>
            <TabsTrigger value="albums" className="text-xs px-2 py-1">
              {t('search.tabAlbums')}
            </TabsTrigger>
          </TabsList>
          {searchType === 'tracks' && <SearchFolderPicker path={downloadPath} onPathChange={setDownloadPath} />}
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
              <SearchResultList query={trackSearch} isUrlMode={trackSearch.isUrlMode} />
            </TrackListProvider>
          </TabsContent>
          <TabsContent value="artists" className="mt-0">
            <ArtistSearchResultList query={artistSearch} />
          </TabsContent>
          <TabsContent value="playlists" className="mt-0">
            <PlaylistSearchResultList query={playlistSearch} />
          </TabsContent>
          <TabsContent value="albums" className="mt-0">
            <PlaylistSearchResultList
              query={albumSearch}
              emptyStateMessage={t('search.emptyStateAlbums')}
              noResultsMessage={t('search.noAlbumResults')}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
