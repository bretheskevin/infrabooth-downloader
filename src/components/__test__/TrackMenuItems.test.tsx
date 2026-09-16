import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackMenuItems } from '../TrackRowActions';
import { DropdownMenu, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import type { TrackInfo } from '@/bindings';
import { useIsSignedIn } from '@/features/auth/store';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockAddToQueue = vi.fn();
const mockOpenShareDialog = vi.fn();

vi.mock('@/features/player', () => ({
  usePlayerStore: { getState: () => ({ addToQueue: mockAddToQueue }) },
  buildPlaybackQueue: (tracks: TrackInfo[]) =>
    tracks.map((t) => ({
      trackId: t.id,
      trackUrl: t.permalink_url,
      title: t.title,
      artist: t.user.username,
      artistId: t.user.id,
      artworkUrl: t.artwork_url,
      durationMs: t.duration,
      waveformUrl: null,
    })),
}));

vi.mock('@/features/auth/store', () => ({
  useIsSignedIn: vi.fn(() => false),
}));

vi.mock('@/hooks/useDownloadState', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand');
  const store = create(() => ({ states: new Map() }));
  return { useDownloadStateStore: store };
});

vi.mock('@/hooks/useOpenDownloadFolder', () => ({
  useOpenDownloadFolder: () => null,
}));

vi.mock('@/hooks/useLinkActions', () => ({
  useLinkActions: () => ({ handleCopyLink: vi.fn(), handleOpenInBrowser: vi.fn() }),
}));

vi.mock('@/features/rekordbox-export/hooks/useTrackExclusion', () => ({
  useTrackExclusion: () => ({ isExcluded: false, toggle: null }),
}));

vi.mock('@/features/messages/store', () => ({
  useMessagesStore: {
    getState: () => ({ openShareDialog: mockOpenShareDialog }),
  },
}));

vi.mock('@/components/PlaylistPickerSubmenu', () => ({
  PlaylistPickerSubmenu: () => null,
}));

const mockTrack: TrackInfo = {
  id: 123,
  title: 'Test Track',
  user: { id: 1, username: 'TestArtist', avatar_url: null },
  artwork_url: null,
  duration: 180000,
  permalink_url: 'https://soundcloud.com/test/track',
  waveform_url: null,
  downloadable: false,
  download_url: null,
  secret_token: null,
};

function renderMenu(props?: Partial<React.ComponentProps<typeof TrackMenuItems>>) {
  return render(
    <DropdownMenu defaultOpen>
      <DropdownMenuContent>
        <TrackMenuItems track={mockTrack} variant="dropdown" {...props} />
      </DropdownMenuContent>
    </DropdownMenu>,
  );
}

describe('TrackMenuItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsSignedIn).mockReturnValue(false);
  });

  it('shows add-to-queue item when signed in', () => {
    vi.mocked(useIsSignedIn).mockReturnValue(true);
    renderMenu();
    expect(screen.getByText('trackMenu.addToQueue')).toBeInTheDocument();
  });

  it('calls addToQueue with item derived from track when add-to-queue is clicked', () => {
    vi.mocked(useIsSignedIn).mockReturnValue(true);
    renderMenu();
    fireEvent.click(screen.getByText('trackMenu.addToQueue'));
    expect(mockAddToQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        trackId: mockTrack.id,
        title: mockTrack.title,
        artist: mockTrack.user.username,
      }),
    );
  });

  it('shows share-by-dm item when signed in', () => {
    vi.mocked(useIsSignedIn).mockReturnValue(true);
    renderMenu();
    expect(screen.getByText('trackMenu.shareByDm')).toBeInTheDocument();
  });

  it('calls openShareDialog with info derived from track on share-by-dm click', () => {
    vi.mocked(useIsSignedIn).mockReturnValue(true);
    const onCloseMenu = vi.fn();
    renderMenu({ onCloseMenu });
    fireEvent.click(screen.getByText('trackMenu.shareByDm'));
    expect(mockOpenShareDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        trackId: mockTrack.id,
        title: mockTrack.title,
        artist: mockTrack.user.username,
        permalinkUrl: mockTrack.permalink_url,
      }),
    );
    expect(onCloseMenu).toHaveBeenCalled();
  });

  it('does not show add-to-queue or share-by-dm when not signed in', () => {
    renderMenu();
    expect(screen.queryByText('trackMenu.addToQueue')).not.toBeInTheDocument();
    expect(screen.queryByText('trackMenu.shareByDm')).not.toBeInTheDocument();
  });
});
