import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AppLayout, type AppPage } from '@/components/layout/AppLayout';
import { DownloadTab } from '@/features/download';
import { LibraryTab } from '@/features/library';
import { SearchTab } from '@/features/search';
import { PlayerContainer } from '@/features/player';
import { AppDialogs } from '@/components/AppDialogs';
import { AppProviders } from '@/providers/AppProviders';
import { useLibraryDownload } from '@/features/queue';
import { useIsSignedIn } from '@/features/auth/store';
import { ArtistProfileView, ArtistPlaylistView, useArtistProfileStore } from '@/features/artist-profile';
import { ArtistDetailView, useNewTracksStore } from '@/features/new-tracks';
import { ArtistReleasesView, ReleaseTracklistView, useNewReleasesStore } from '@/features/new-releases';
import { PlaylistDetailView } from '@/features/library/components/PlaylistDetailView';
import { NotificationsPage, useNotificationsStore, playlistSummaryToLibraryPlaylist } from '@/features/notifications';
import { ConversationPage, useMessagesStore } from '@/features/messages';
import { useSelectionsStore } from '@/features/selections';
import { toLibraryPlaylist } from '@/features/selections/utils/adapter';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { TrackInfo } from '@/bindings';

function clearDetailOverlays() {
  useArtistProfileStore.getState().closeProfile();
  useNewTracksStore.getState().clearSelectedArtist();
  useSelectionsStore.getState().clearSelectedMix();
  useNewReleasesStore.getState().goBackToCarousel();
  useNotificationsStore.getState().clear();
  useMessagesStore.getState().clear();
}

function PageContent({
  activePage,
  handleDownloadTracks,
}: {
  activePage: AppPage;
  handleDownloadTracks: (tracks: TrackInfo[], title: string) => void | Promise<void>;
}) {
  const isSignedIn = useIsSignedIn();
  const { profileArtistId, profileArtistName } = useArtistProfileStore(
    useShallow((s) => ({ profileArtistId: s.profileArtistId, profileArtistName: s.profileArtistName }))
  );
  const selectedArtist = useNewTracksStore((s) => s.selectedArtist);
  const selectedMix = useSelectionsStore((s) => s.selectedMix);
  const newReleasesView = useNewReleasesStore((s) => s.viewState);
  const isNotificationsPageOpen = useNotificationsStore((s) => s.isPageOpen);
  const isConversationPageOpen = useMessagesStore((s) => s.isPageOpen);
  const notificationPlaylist = useNotificationsStore((s) => s.selectedPlaylist);
  const messagePlaylist = useMessagesStore((s) => s.selectedPlaylist);

  const { t } = useTranslation();
  const [slideClass, setSlideClass] = useState('');
  const prevHasOverlayRef = useRef(false);
  const hasNotificationOverlay = isNotificationsPageOpen || notificationPlaylist;
  const hasOverlay = !!(selectedArtist || selectedMix || profileArtistId || newReleasesView.view !== 'carousel' || hasNotificationOverlay || isConversationPageOpen);

  useLayoutEffect(() => {
    if (hasOverlay && !prevHasOverlayRef.current) {
      setSlideClass('library-slide-in-detail');
    } else if (!hasOverlay && prevHasOverlayRef.current) {
      setSlideClass('library-slide-in-list');
    }
    prevHasOverlayRef.current = hasOverlay;
  }, [hasOverlay]);

  useEffect(() => {
    if (!isSignedIn) clearDetailOverlays();
  }, [isSignedIn]);

  const handleBackFromArtist = useCallback(() => {
    useNewTracksStore.getState().clearSelectedArtist();
  }, []);

  const handleBackFromMix = useCallback(() => {
    useSelectionsStore.getState().clearSelectedMix();
  }, []);

  const handleBackToReleasesCarousel = useCallback(() => {
    useNewReleasesStore.getState().goBackToCarousel();
  }, []);

  const handleBackToReleases = useCallback(() => {
    useNewReleasesStore.getState().goBackToReleases();
  }, []);

  if (messagePlaylist) {
    return (
      <section className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <ArtistPlaylistView
          playlist={messagePlaylist}
          artistName={t('directMessages.title')}
          onBack={() => useMessagesStore.getState().closePlaylist()}
          onDownloadTracks={handleDownloadTracks}
        />
      </section>
    );
  }

  if (notificationPlaylist) {
    const libraryPlaylist = playlistSummaryToLibraryPlaylist(notificationPlaylist);
    return (
      <section className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <PlaylistDetailView
          playlist={libraryPlaylist}
          onBack={() => useNotificationsStore.getState().closePlaylist()}
          onDownloadTracks={handleDownloadTracks}
        />
      </section>
    );
  }

  if (profileArtistId && profileArtistName) {
    return (
      <section className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <ArtistProfileView
          artistId={profileArtistId}
          artistName={profileArtistName}
          onDownloadTracks={handleDownloadTracks}
        />
      </section>
    );
  }

  if (isConversationPageOpen) {
    return (
      <section className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <ConversationPage />
      </section>
    );
  }

  if (isNotificationsPageOpen) {
    return (
      <section className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <NotificationsPage />
      </section>
    );
  }

  if (selectedArtist) {
    return (
      <section key="artist-detail" className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <ArtistDetailView
          artist={selectedArtist}
          onBack={handleBackFromArtist}
          onDownloadTracks={handleDownloadTracks}
        />
      </section>
    );
  }

  if (selectedMix) {
    return (
      <section key="mix-detail" className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <PlaylistDetailView
          playlist={toLibraryPlaylist(selectedMix)}
          initialTracks={selectedMix.tracks}
          onBack={handleBackFromMix}
          onDownloadTracks={handleDownloadTracks}
        />
      </section>
    );
  }

  if (newReleasesView.view === 'tracklist') {
    return (
      <section key="release-tracklist" className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <ReleaseTracklistView
          artist={newReleasesView.artist}
          release={newReleasesView.release}
          onBackToReleases={handleBackToReleases}
          onBackToCarousel={handleBackToReleasesCarousel}
          onDownloadTracks={handleDownloadTracks}
        />
      </section>
    );
  }

  if (newReleasesView.view === 'releases') {
    return (
      <section key="release-detail" className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <ArtistReleasesView
          artist={newReleasesView.artist}
          filter={newReleasesView.filter}
          onBack={handleBackToReleasesCarousel}
        />
      </section>
    );
  }

  if (activePage === 'download') {
    return (
      <section className={slideClass}>
        <DownloadTab onDownloadTracks={handleDownloadTracks} />
      </section>
    );
  }

  if (activePage === 'library') {
    return (
      <section className={cn('flex-1 min-h-0 flex flex-col', slideClass)}>
        <LibraryTab onDownloadTracks={handleDownloadTracks} />
      </section>
    );
  }

  return (
    <section className={cn('flex-1 min-h-0 flex flex-col', slideClass)}>
      <SearchTab />
    </section>
  );
}

function AppContent() {
  const [activePage, setActivePage] = useState<AppPage>('download');
  const isSignedIn = useIsSignedIn();

  const handlePageChange = useCallback((page: AppPage) => {
    clearDetailOverlays();
    setActivePage(page);
  }, []);

  const {
    handleDownloadTracks,
    pendingDownload,
    handleConfirmReplace,
    handleCancelReplace,
  } = useLibraryDownload({
    onNavigateToDownload: () => handlePageChange('download'),
  });

  const profileArtistId = useArtistProfileStore((s) => s.profileArtistId);
  const isConversationPageOpen = useMessagesStore((s) => s.isPageOpen);

  return (
    <AppLayout
      activePage={activePage}
      onPageChange={handlePageChange}
      isSignedIn={isSignedIn}
      hideTabs={!!profileArtistId || isConversationPageOpen}
    >
      <PageContent
        activePage={activePage}
        handleDownloadTracks={handleDownloadTracks}
      />
      <PlayerContainer />
      <AppDialogs
        pendingDownload={pendingDownload}
        onConfirmReplace={handleConfirmReplace}
        onCancelReplace={handleCancelReplace}
      />
    </AppLayout>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
