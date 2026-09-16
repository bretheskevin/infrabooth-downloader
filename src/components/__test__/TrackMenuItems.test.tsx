import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackMenuItems } from '../TrackRowActions';
import { DropdownMenu, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { TrackListContext } from '@/components/track-list-context';
import type { TrackListContextValue } from '@/components/track-list-context';
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

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenuItem: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button role="menuitem" onClick={onClick} className={className}>
      {children}
    </button>
  ),
  ContextMenuSeparator: () => null,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

const mockRemoveFromPlaylist = vi.fn();

const minimalContextValue = {
  playTrack: vi.fn(),
  downloadTrack: vi.fn(),
  isDownloadEnabled: false,
  downloadedIds: new Set<number>(),
};

function renderMenuWithRemover(props?: Partial<React.ComponentProps<typeof TrackMenuItems>>) {
  const ctx = { ...minimalContextValue, removeFromPlaylist: mockRemoveFromPlaylist } as unknown as TrackListContextValue;
  return render(
    <TrackListContext.Provider value={ctx}>
      <DropdownMenu defaultOpen>
        <DropdownMenuContent>
          <TrackMenuItems track={mockTrack} variant="dropdown" {...props} />
        </DropdownMenuContent>
      </DropdownMenu>
    </TrackListContext.Provider>,
  );
}

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

describe('TrackMenuItems — remove from playlist via context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsSignedIn).mockReturnValue(false);
  });

  it('shows remove-from-playlist when signed in and context provides a remover', () => {
    vi.mocked(useIsSignedIn).mockReturnValue(true);
    renderMenuWithRemover();
    expect(screen.getByText('trackMenu.removeFromPlaylist')).toBeInTheDocument();
  });

  it('does not show remove-from-playlist when signed in but context has no remover', () => {
    vi.mocked(useIsSignedIn).mockReturnValue(true);
    renderMenu();
    expect(screen.queryByText('trackMenu.removeFromPlaylist')).not.toBeInTheDocument();
  });

  it('does not show remove-from-playlist on standalone usage without provider', () => {
    vi.mocked(useIsSignedIn).mockReturnValue(true);
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuContent>
          <TrackMenuItems track={mockTrack} variant="dropdown" />
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.queryByText('trackMenu.removeFromPlaylist')).not.toBeInTheDocument();
  });

  it('calls removeFromPlaylist with the track when remove item is clicked in dropdown', () => {
    vi.mocked(useIsSignedIn).mockReturnValue(true);
    renderMenuWithRemover();
    fireEvent.click(screen.getByText('trackMenu.removeFromPlaylist'));
    expect(mockRemoveFromPlaylist).toHaveBeenCalledWith(mockTrack);
  });

  it('shows remove-from-playlist in context menu variant when signed in and context provides a remover', () => {
    vi.mocked(useIsSignedIn).mockReturnValue(true);
    const ctx = { ...minimalContextValue, removeFromPlaylist: mockRemoveFromPlaylist } as unknown as TrackListContextValue;
    render(
      <TrackListContext.Provider value={ctx}>
        <TrackMenuItems track={mockTrack} variant="context" />
      </TrackListContext.Provider>,
    );
    expect(screen.getByText('trackMenu.removeFromPlaylist')).toBeInTheDocument();
  });

  it('calls removeFromPlaylist with the track when remove item is clicked in context menu', () => {
    vi.mocked(useIsSignedIn).mockReturnValue(true);
    const ctx = { ...minimalContextValue, removeFromPlaylist: mockRemoveFromPlaylist } as unknown as TrackListContextValue;
    render(
      <TrackListContext.Provider value={ctx}>
        <TrackMenuItems track={mockTrack} variant="context" />
      </TrackListContext.Provider>,
    );
    fireEvent.click(screen.getByText('trackMenu.removeFromPlaylist'));
    expect(mockRemoveFromPlaylist).toHaveBeenCalledWith(mockTrack);
  });
});
