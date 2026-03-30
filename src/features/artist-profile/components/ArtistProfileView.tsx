import { useMemo, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrackListProvider } from '@/components/InteractiveTrackRow';
import { useTrackSelection } from '@/features/library/hooks/useTrackSelection';
import { usePlayContext } from '@/features/player';
import { useIsDownloadEnabled } from '@/features/settings';
import { useSettingsStore } from '@/features/settings/store';
import { useTrackDownloadState } from '@/hooks/useTrackDownloadState';
import { useSearchFilter } from '@/hooks/useSearchFilter';

import { useArtistProfile } from '../hooks/useArtistProfile';
import { useArtistTracks } from '../hooks/useArtistTracks';
import { ArtistProfileHeader } from './ArtistProfileHeader';
import { ArtistTrackList } from './ArtistTrackList';
import { SearchBar } from '@/components/ui/search-bar';
import type { SortDirection } from '@/lib/sort';
import type { TrackInfo } from '@/bindings';
import type { SortOption } from '../types';

const MIN_TRACKS_FOR_SEARCH = 5;

interface ArtistProfileViewProps {
  artistId: number;
  artistName: string;
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], title: string) => void | Promise<void>;
}

export function ArtistProfileView({
  artistId,
  artistName,
  onBack,
  onDownloadTracks,
}: ArtistProfileViewProps) {
  const [sort, setSort] = useState<SortOption>('recent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const isDownloadEnabled = useIsDownloadEnabled();
  const downloadPath = useSettingsStore((s) => s.downloadPath);

  const { data: profile, isLoading: isProfileLoading } = useArtistProfile(artistId);
  const {
    data: tracksData,
    isLoading: isTracksLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useArtistTracks(artistId);

  const tracks = useMemo(() => {
    const all = tracksData?.pages.flatMap((page) => page.tracks) ?? [];
    if (sort === 'recent') {
      return [...all].sort((a, b) => b.id - a.id);
    }
    return all;
  }, [tracksData, sort]);

  const { searchQuery, setSearchQuery, filteredTracks } = useSearchFilter(tracks);

  useEffect(() => {
    setSearchQuery('');
    setSortDirection('desc');
    setSort('recent');
  }, [artistId, setSearchQuery]);

  const displayTracks = useMemo(
    () => sortDirection === 'asc' ? [...filteredTracks].reverse() : filteredTracks,
    [filteredTracks, sortDirection],
  );

  const { downloadTrack, downloadedIds } = useTrackDownloadState({
    tracks: tracks.length > 0 ? tracks : undefined,
    downloadPath,
    enabled: !isTracksLoading && tracks.length > 0,
  });

  const { selectedIds, toggleTrack, toggleAll, isAllSelected, selectedTracks } =
    useTrackSelection(displayTracks, downloadedIds);

  const { playTrack } = usePlayContext(displayTracks);

  const handleDownloadAll = useCallback(() => {
    const tracksToDownload = selectedTracks.length > 0 ? selectedTracks : tracks;
    if (tracksToDownload.length > 0) {
      onDownloadTracks(tracksToDownload, profile?.username ?? artistName);
    }
  }, [selectedTracks, tracks, profile, artistName, onDownloadTracks]);

  const { t } = useTranslation();

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3 px-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-1.5 -ml-2 h-7 text-xs text-muted-foreground hover:text-foreground self-start"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('common.back')}
      </Button>

      <ArtistProfileHeader
        profile={profile}
        isLoading={isProfileLoading}
        onDownloadAll={handleDownloadAll}
        hasDownloadableTracks={tracks.length > 0}
        isDownloadEnabled={isDownloadEnabled}
        showOrderToggle={tracks.length > 1}
      />

      {tracks.length >= MIN_TRACKS_FOR_SEARCH && (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('artistProfile.filterPlaceholder')}
        />
      )}

      <TrackListProvider
        playTrack={playTrack}
        downloadTrack={downloadTrack}
        isDownloadEnabled={isDownloadEnabled}
        downloadedIds={downloadedIds}
        selection={{ selectedIds, toggleTrack }}
      >
        <ArtistTrackList
          tracks={displayTracks}
          isLoading={isTracksLoading}
          hasNextPage={hasNextPage ?? false}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          sort={sort}
          onSortChange={setSort}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          isAllSelected={isAllSelected}
          onToggleAll={toggleAll}
        />
      </TrackListProvider>
    </div>
  );
}
