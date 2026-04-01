import { useMemo, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrackListProvider } from '@/components/InteractiveTrackRow';
import { SelectionActionBar } from '@/components/SelectionActionBar';
import { useTrackSelection } from '@/features/library/hooks/useTrackSelection';
import { useDownloadSelected } from '@/hooks/useDownloadSelected';
import { usePlayContext } from '@/features/player';
import { useIsDownloadEnabled } from '@/features/settings';
import { useSettingsStore } from '@/features/settings/store';
import { useTrackDownloadState } from '@/hooks/useTrackDownloadState';
import { useSearchFilter } from '@/hooks/useSearchFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { ArtistAvatarImage } from '@/features/new-tracks/components/ArtistAvatarImage';
import { getArtworkUrl } from '@/lib/soundcloud';

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
    isStreaming,
  } = useArtistTracks(artistId);

  const tracks = useMemo(() => {
    const all = tracksData ?? [];
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

  const { selectedIds, toggleTrack, toggleAll, isAllSelected, selectedTracks, selectedCount, clearSelection } =
    useTrackSelection(displayTracks, downloadedIds);

  const { playTrack } = usePlayContext(displayTracks);

  const handleDownloadAll = useCallback(() => {
    const tracksToDownload = selectedTracks.length > 0 ? selectedTracks : tracks;
    if (tracksToDownload.length > 0) {
      onDownloadTracks(tracksToDownload, profile?.username ?? artistName);
    }
  }, [selectedTracks, tracks, profile, artistName, onDownloadTracks]);

  const handleDownloadSelected = useDownloadSelected(
    selectedTracks, clearSelection, onDownloadTracks, profile?.username ?? artistName,
  );

  const { t } = useTranslation();

  const bannerUrl = profile?.visuals?.visuals?.[0]?.visual_url ?? null;
  const avatarUrl = profile ? getArtworkUrl(profile.avatar_url ?? null, 200) : null;

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

      {isProfileLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : (
        <div className="relative h-24 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
          {bannerUrl && (
            <img src={bannerUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 flex items-center">
            <div className="flex items-center gap-2.5 backdrop-blur-sm bg-black/50 rounded-lg px-4 py-1.5 ml-3">
              <ArtistAvatarImage
                avatarUrl={avatarUrl}
                username={profile?.username ?? artistName}
                className="w-9 h-9 ring-2 ring-white/20 shrink-0"
              />
              <h2 className="text-sm font-bold text-white truncate drop-shadow-sm max-w-56">
                {profile?.username ?? artistName}
              </h2>
            </div>
          </div>
        </div>
      )}

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
          isStreaming={isStreaming}
          sort={sort}
          onSortChange={setSort}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          isAllSelected={isAllSelected}
          onToggleAll={toggleAll}
        />
      </TrackListProvider>

      <SelectionActionBar selectedCount={selectedCount} onDownload={handleDownloadSelected} />
    </div>
  );
}
