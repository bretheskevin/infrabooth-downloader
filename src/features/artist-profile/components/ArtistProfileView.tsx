import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DetailViewLayout } from '@/components/detail-view/DetailViewLayout';
import { getArtworkUrl } from '@/lib/soundcloud';
import { useIsDownloadEnabled } from '@/features/settings';

import { useArtistProfile } from '../hooks/useArtistProfile';
import { useArtistTracks } from '../hooks/useArtistTracks';
import { ArtistProfileHeader } from './ArtistProfileHeader';
import { FollowButton } from './FollowButton';
import { ProfileBanner } from './ProfileBanner';
import { ProfileTabs, type ProfileTab } from './ProfileTabs';
import { PlaylistGrid } from './PlaylistGrid';
import { ArtistPlaylistView } from './ArtistPlaylistView';
import type { SortDirection } from '@/lib/sort';
import type { TrackInfo, ArtistPlaylist, SortOption } from '@/bindings';

interface ArtistProfileViewProps {
  artistId: number;
  artistName: string;
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
}

export function ArtistProfileView({
  artistId,
  artistName,
  onBack,
  onDownloadTracks,
}: ArtistProfileViewProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ProfileTab>('recent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedPlaylist, setSelectedPlaylist] = useState<ArtistPlaylist | null>(null);
  const [prevArtistId, setPrevArtistId] = useState(artistId);

  if (prevArtistId !== artistId) {
    setPrevArtistId(artistId);
    setActiveTab('recent');
    setSortDirection('desc');
    setSelectedPlaylist(null);
  }

  const { data: profile, isLoading: isProfileLoading } = useArtistProfile(artistId);
  const isDownloadEnabled = useIsDownloadEnabled();

  const isPlaylistsTab = activeTab === 'playlists';
  const sortOption: SortOption = isPlaylistsTab ? 'recent' : activeTab;

  const {
    data: tracksData,
    isLoading: isTracksLoading,
    isStreaming,
    error: tracksError,
    refetch: refetchTracks,
  } = useArtistTracks(artistId, sortOption);

  const tracks = useMemo(() => tracksData ?? [], [tracksData]);
  const sortedTracks = useMemo(
    () => (sortDirection === 'asc' ? [...tracks].reverse() : tracks),
    [tracks, sortDirection],
  );

  const bannerUrl = profile?.visuals?.visuals?.[0]?.visual_url ?? null;
  const avatarUrl = profile ? getArtworkUrl(profile.avatar_url ?? null, 200) : null;
  const username = profile?.username ?? artistName;

  const handleDownloadAll = useCallback(() => {
    if (sortedTracks.length > 0) onDownloadTracks(sortedTracks, username);
  }, [sortedTracks, onDownloadTracks, username]);

  if (selectedPlaylist) {
    return (
      <ArtistPlaylistView
        playlist={selectedPlaylist}
        artistName={username}
        onBack={() => setSelectedPlaylist(null)}
        onDownloadTracks={onDownloadTracks}
      />
    );
  }

  const canDownload = isDownloadEnabled && !isPlaylistsTab && sortedTracks.length > 0 && !isTracksLoading;

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Stable header — never remounts across tab switches */}
      <div className="flex flex-col gap-3 px-3">
        <ProfileBanner
          onBack={onBack}
          isLoading={isProfileLoading}
          bannerUrl={bannerUrl}
          avatarUrl={avatarUrl}
          username={username}
        />
        <ArtistProfileHeader
          profile={profile}
          isLoading={isProfileLoading}
          isDownloadEnabled={isDownloadEnabled}
          showOrderToggle={!isPlaylistsTab && (tracksData?.length ?? 0) > 1}
          actions={
            canDownload ? (
              <Button size="sm" onClick={handleDownloadAll} className="gap-1.5 shrink-0">
                <Download className="h-3.5 w-3.5" />
                {t('common.downloadAll')}
              </Button>
            ) : undefined
          }
          followButton={<FollowButton artistId={artistId} artistUsername={profile?.username} />}
        />
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          showSortDirection={!isPlaylistsTab && (tracksData?.length ?? 0) > 1}
          isStreaming={isStreaming}
        />
      </div>

      {/* Content — only this swaps, header + tabs above stay mounted */}
      {isPlaylistsTab ? (
        <div className="px-3 flex-1 min-h-0 overflow-y-auto">
          <PlaylistGrid artistId={artistId} onSelectPlaylist={setSelectedPlaylist} />
        </div>
      ) : (
        <DetailViewLayout
          tracks={sortedTracks}
          isLoading={isTracksLoading}
          isStreaming={isStreaming}
          error={tracksError}
          onRetry={refetchTracks}
          title={username}
          resetKey={artistId}
          header={null}
          folder
          download={{ onDownloadTracks }}
          trackList={{
            virtualized: true,
            searchThreshold: 5,
          }}
          messages={{ empty: 'artistProfile.noTracks' }}
        />
      )}
    </div>
  );
}
