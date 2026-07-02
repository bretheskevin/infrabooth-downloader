import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AppLayout, type AppPage } from '@/components/layout/AppLayout';
import { DownloadTab, DownloadOverlay } from '@/features/download';
import { LibraryTab } from '@/features/library';
import { SearchTab } from '@/features/search';
import { PlayerContainer, PlayerHooksProvider } from '@/features/player';
import { useRemoteBridge } from '@/features/remote';
import { AppDialogs } from '@/components/AppDialogs';
import { AppProviders } from '@/providers/AppProviders';
import { useLibraryDownload } from '@/features/queue';
import { useIsSignedIn } from '@/features/auth/store';
import { ArtistProfileView, useArtistProfileStore } from '@/features/artist-profile';
import { ArtistDetailView, useNewTracksStore } from '@/features/new-tracks';
import { ArtistReleasesView, ReleaseTracklistView, useNewReleasesStore } from '@/features/new-releases';
import {
  PlaylistDetailView,
  fromArtistPlaylist,
  fromMessagePlaylistEmbed,
  fromNotificationPlaylist,
  fromSelection,
} from '@/components/playlist-detail';
import { useSelectedPlaylistStore } from '@/features/search/selected-playlist-store';
import { NotificationsPage, useNotificationsStore } from '@/features/notifications';
import { ConversationPage, MessagesPage, WidescreenMessagesLayout, useMessagesStore } from '@/features/messages';
import { useIsWidescreen } from '@/hooks/useIsWidescreen';
import { useSelectionsStore } from '@/features/selections';
import { useAuthStore } from '@/features/auth/store';
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
  useSelectedPlaylistStore.getState().closePlaylist();
}

function PageContent({
  activePage,
  handleDownloadTracks,
}: {
  activePage: AppPage;
  handleDownloadTracks: (tracks: TrackInfo[], title: string) => void | Promise<void>;
}) {
  const isSignedIn = useIsSignedIn();
  const authUserId = useAuthStore((s) => s.userId);
  const { profileArtistId, profileArtistName } = useArtistProfileStore(
    useShallow((s) => ({
      profileArtistId: s.profileArtistId,
      profileArtistName: s.profileArtistName,
    })),
  );
  const selectedArtist = useNewTracksStore((s) => s.selectedArtist);
  const selectedMix = useSelectionsStore((s) => s.selectedMix);
  const newReleasesView = useNewReleasesStore((s) => s.viewState);
  const isNotificationsPageOpen = useNotificationsStore((s) => s.isPageOpen);
  const isMessagesPageOpen = useMessagesStore((s) => s.isPageOpen);
  const selectedConversation = useMessagesStore((s) => s.selectedConversation);
  const notificationPlaylist = useNotificationsStore((s) => s.selectedPlaylist);
  const messagePlaylist = useMessagesStore((s) => s.selectedPlaylist);
  const searchPlaylist = useSelectedPlaylistStore((s) => s.selectedPlaylist);

  const isWidescreen = useIsWidescreen();
  const { t } = useTranslation();
  const [slideClass, setSlideClass] = useState('');
  const prevHasOverlayRef = useRef(false);
  const hasNotificationOverlay = (isNotificationsPageOpen && !isWidescreen) || notificationPlaylist;
  const hasOverlay = !!(
    selectedArtist ||
    selectedMix ||
    profileArtistId ||
    newReleasesView.view !== 'carousel' ||
    hasNotificationOverlay ||
    isMessagesPageOpen ||
    searchPlaylist
  );

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
        <PlaylistDetailView
          playlist={fromMessagePlaylistEmbed(messagePlaylist, authUserId)}
          breadcrumbItems={[{ label: t('directMessages.title'), onClick: () => useMessagesStore.getState().closePlaylist() }]}
          onDownloadTracks={handleDownloadTracks}
        />
      </section>
    );
  }

  if (notificationPlaylist) {
    return (
      <section className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <PlaylistDetailView
          playlist={fromNotificationPlaylist(notificationPlaylist, authUserId)}
          breadcrumbItems={[{ label: t('notifications.title'), onClick: () => useNotificationsStore.getState().closePlaylist() }]}
          onDownloadTracks={handleDownloadTracks}
        />
      </section>
    );
  }

  if (searchPlaylist) {
    return (
      <section className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <PlaylistDetailView
          playlist={fromArtistPlaylist(searchPlaylist, '', authUserId)}
          breadcrumbItems={[{ label: t('search.tabLabel'), onClick: () => useSelectedPlaylistStore.getState().closePlaylist() }]}
          onDownloadTracks={handleDownloadTracks}
        />
      </section>
    );
  }

  if (profileArtistId && profileArtistName) {
    return (
      <section className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <ArtistProfileView artistId={profileArtistId} artistName={profileArtistName} onDownloadTracks={handleDownloadTracks} />
      </section>
    );
  }

  if (isMessagesPageOpen && isWidescreen) {
    return (
      <section className={cn('flex-1 min-h-0 flex flex-col', slideClass)}>
        <WidescreenMessagesLayout />
      </section>
    );
  }

  if (isMessagesPageOpen && selectedConversation) {
    return (
      <section className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <ConversationPage />
      </section>
    );
  }

  if (isMessagesPageOpen) {
    return (
      <section className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <MessagesPage />
      </section>
    );
  }

  if (isNotificationsPageOpen && !isWidescreen) {
    return (
      <section className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <NotificationsPage />
      </section>
    );
  }

  if (selectedArtist) {
    return (
      <section key="artist-detail" className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <ArtistDetailView artist={selectedArtist} onBack={handleBackFromArtist} onDownloadTracks={handleDownloadTracks} />
      </section>
    );
  }

  if (selectedMix) {
    return (
      <section key="mix-detail" className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <PlaylistDetailView
          playlist={fromSelection(selectedMix)}
          initialTracks={selectedMix.tracks}
          breadcrumbItems={[{ label: selectedMix.shortTitle, onClick: handleBackFromMix }]}
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
        <ArtistReleasesView artist={newReleasesView.artist} filter={newReleasesView.filter} onBack={handleBackToReleasesCarousel} />
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

  const { handleDownloadTracks, pendingDownload, handleConfirmReplace, handleCancelReplace } = useLibraryDownload({
    onNavigateToDownload: () => handlePageChange('download'),
  });

  const profileArtistId = useArtistProfileStore((s) => s.profileArtistId);
  const isMessagesPageOpen = useMessagesStore((s) => s.isPageOpen);
  const isNotificationsPageOpen = useNotificationsStore((s) => s.isPageOpen);

  return (
    <AppLayout
      activePage={activePage}
      onPageChange={handlePageChange}
      isSignedIn={isSignedIn}
      hideTabs={!!profileArtistId || isMessagesPageOpen || isNotificationsPageOpen}
    >
      <PageContent activePage={activePage} handleDownloadTracks={handleDownloadTracks} />
      <DownloadOverlay />
      <PlayerContainer />
      <AppDialogs pendingDownload={pendingDownload} onConfirmReplace={handleConfirmReplace} onCancelReplace={handleCancelReplace} />
    </AppLayout>
  );
}

function RemoteBridgeProvider() {
  useRemoteBridge();
  return null;
}

export function App() {
  return (
    <AppProviders>
      <PlayerHooksProvider />
      <RemoteBridgeProvider />
      <AppContent />
    </AppProviders>
  );
}
