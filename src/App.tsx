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
import { ArtistProfileView, useArtistProfileStore } from '@/features/artist-profile';
import { ArtistDetailView, useNewTracksStore } from '@/features/new-tracks';
import { PlaylistDetailView } from '@/features/library/components/PlaylistDetailView';
import { useSelectionsStore } from '@/features/selections';
import { toLibraryPlaylist } from '@/features/selections/utils/adapter';
import { cn } from '@/lib/utils';
import type { TrackInfo } from '@/bindings';

function clearDetailOverlays() {
  useNewTracksStore.getState().clearSelectedArtist();
  useSelectionsStore.getState().clearSelectedMix();
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

  const [slideClass, setSlideClass] = useState('');
  const prevHasOverlayRef = useRef(false);
  const hasOverlay = !!(selectedArtist || selectedMix || profileArtistId);

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

  const handleCloseProfile = useCallback(() => {
    useArtistProfileStore.getState().closeProfile();
  }, []);

  const handleBackFromArtist = useCallback(() => {
    useNewTracksStore.getState().clearSelectedArtist();
  }, []);

  const handleBackFromMix = useCallback(() => {
    useSelectionsStore.getState().clearSelectedMix();
  }, []);

  if (profileArtistId && profileArtistName) {
    return (
      <section className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <ArtistProfileView
          artistId={profileArtistId}
          artistName={profileArtistName}
          onBack={handleCloseProfile}
          onDownloadTracks={handleDownloadTracks}
        />
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
    useArtistProfileStore.getState().closeProfile();
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

  return (
    <AppLayout
      activePage={activePage}
      onPageChange={handlePageChange}
      isSignedIn={isSignedIn}
      hideTabs={!!profileArtistId}
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
