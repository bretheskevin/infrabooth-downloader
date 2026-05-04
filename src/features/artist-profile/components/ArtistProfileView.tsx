import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrackListView } from '@/components/track-list/TrackListView';
import { PreserveOrderToggle } from '@/components/PreserveOrderToggle';
import { getArtworkUrl } from '@/lib/soundcloud';
import { useIsDownloadEnabled } from '@/features/settings';

import { useArtistProfile } from '../hooks/useArtistProfile';
import { useArtistTracks } from '../hooks/useArtistTracks';
import { useArtistLikedTracks } from '../hooks/useArtistLikedTracks';
import { ArtistProfileHeader } from './ArtistProfileHeader';
import { ArtistFollowList } from './ArtistFollowList';
import { FollowButton } from './FollowButton';
import { ProfileBanner } from './ProfileBanner';
import { ProfileTabs, type ProfileTab } from './ProfileTabs';
import { PlaylistGrid } from './PlaylistGrid';
import { PlaylistDetailView, fromArtistPlaylist } from '@/components/playlist-detail';
import { useAuthStore } from '@/features/auth/store';
import { useArtistProfileStore } from '../store';
import type { TrackInfo, ArtistPlaylist, SortOption } from '@/bindings';

interface ArtistProfileViewProps {
  artistId: number;
  artistName: string;
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
}

export function ArtistProfileView({ artistId, artistName, onDownloadTracks }: ArtistProfileViewProps) {
  const { t } = useTranslation();
  const authUserId = useAuthStore((s) => s.userId);
  const activeFollowView = useArtistProfileStore((s) => s.activeFollowView);
  const [activeTab, setActiveTab] = useState<ProfileTab>('recent');
  const [selectedPlaylist, setSelectedPlaylist] = useState<ArtistPlaylist | null>(null);
  const [prevArtistId, setPrevArtistId] = useState(artistId);

  if (prevArtistId !== artistId) {
    setPrevArtistId(artistId);
    setActiveTab('recent');
    setSelectedPlaylist(null);
  }

  const { data: profile, isLoading: isProfileLoading } = useArtistProfile(artistId);
  const isDownloadEnabled = useIsDownloadEnabled();

  const isPlaylistsTab = activeTab === 'playlists';
  const isLikesTab = activeTab === 'likes';
  const sortOption: SortOption = isPlaylistsTab || isLikesTab ? 'recent' : activeTab;

  const artistTracks = useArtistTracks(isLikesTab ? null : artistId, sortOption);
  const likedTracks = useArtistLikedTracks(isLikesTab ? artistId : null);

  const {
    data: tracksData,
    isLoading: isTracksLoading,
    isStreaming,
    error: tracksError,
    refetch: refetchTracks,
  } = isLikesTab ? likedTracks : artistTracks;

  const tracks = useMemo(() => tracksData ?? [], [tracksData]);

  const bannerUrl = profile?.visuals?.visuals?.[0]?.visual_url ?? null;
  const avatarUrl = profile ? getArtworkUrl(profile.avatar_url ?? null, 200) : null;
  const username = profile?.username ?? artistName;

  const handleDownloadAll = useCallback(() => {
    if (tracks.length > 0) onDownloadTracks(tracks, username);
  }, [tracks, onDownloadTracks, username]);

  if (activeFollowView) {
    return <ArtistFollowList type={activeFollowView} artistId={artistId} artistName={username} />;
  }

  if (selectedPlaylist) {
    return (
      <PlaylistDetailView
        playlist={fromArtistPlaylist(selectedPlaylist, username, authUserId)}
        breadcrumbItems={[{ label: username, onClick: () => setSelectedPlaylist(null) }]}
        onDownloadTracks={onDownloadTracks}
      />
    );
  }

  const canDownload = isDownloadEnabled && !isPlaylistsTab && tracks.length > 0 && !isTracksLoading;
  const showOrderToggle = canDownload && tracks.length > 1;

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="flex flex-col gap-3 px-3">
        <ProfileBanner
          isLoading={isProfileLoading}
          bannerUrl={bannerUrl}
          avatarUrl={avatarUrl}
          username={username}
          permalinkUrl={profile?.permalink_url}
        />
        <ArtistProfileHeader
          profile={profile}
          isLoading={isProfileLoading}
          actions={
            canDownload ? (
              <div className="flex items-center gap-2 shrink-0">
                {showOrderToggle && <PreserveOrderToggle variant="icon" />}
                <Button size="sm" onClick={handleDownloadAll} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  {t('common.downloadAll')}
                </Button>
              </div>
            ) : undefined
          }
          followButton={<FollowButton artistId={artistId} artistUsername={profile?.username} />}
        />
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {isPlaylistsTab ? (
        <div className="px-3 flex-1 min-h-0 overflow-y-auto">
          <PlaylistGrid artistId={artistId} onSelectPlaylist={setSelectedPlaylist} />
        </div>
      ) : (
        <TrackListView
          tracks={tracks}
          isLoading={isTracksLoading}
          isStreaming={isStreaming}
          error={tracksError}
          onRetry={refetchTracks}
          title={username}
          resetKey={`${artistId}-${activeTab}`}
          header={null}
          folder
          download={{ onDownloadTracks }}
          messages={{ empty: isLikesTab ? 'artistProfile.noLikes' : 'artistProfile.noTracks' }}
        />
      )}
    </div>
  );
}
