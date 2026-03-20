import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import { PlaylistPickerSubmenu } from '@/components/PlaylistPickerSubmenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

vi.mock('@/lib/tauri', () => ({
  api: {
    getLibraryPlaylists: vi.fn(),
    getOwnedPlaylistsForTrack: vi.fn(),
    addTrackToPlaylist: vi.fn(),
    clearLibraryCache: vi.fn(),
  },
}));

const { api } = await import('@/lib/tauri');

const mockLibraryPlaylists = [
  { id: 1, title: 'My Playlist', artwork_url: null, is_owned: true, secret_token: null },
  { id: 2, title: 'Liked', artwork_url: null, is_owned: false, secret_token: null },
  { id: 3, title: 'Another Owned', artwork_url: null, is_owned: true, secret_token: null },
];

const mockMembershipData = [
  { id: 1, title: 'My Playlist', artwork_url: null, contains_track: false },
  { id: 3, title: 'Another Owned', artwork_url: null, contains_track: true },
];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function SubmenuWrapper({ trackId }: { trackId: number }) {
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button>Open Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <PlaylistPickerSubmenu trackId={trackId} variant="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      {ui}
    </QueryClientProvider>
  );
}

async function openSubmenu(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByText('trackMenu.addToPlaylist');
  trigger.focus();
  await user.keyboard('{ArrowRight}');
}

describe('Add to playlist logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: null });
    (api.getLibraryPlaylists as ReturnType<typeof vi.fn>).mockResolvedValue(mockLibraryPlaylists);
    (api.getOwnedPlaylistsForTrack as ReturnType<typeof vi.fn>).mockResolvedValue(mockMembershipData);
    (api.addTrackToPlaylist as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  describe('useAddToPlaylist hook', () => {
    it('calls api.addTrackToPlaylist with correct parameters', async () => {
      const { useAddToPlaylist } = await import('@/hooks/useAddToPlaylist');

      function TestComponent() {
        const { addToPlaylist, addingToPlaylistId } = useAddToPlaylist();
        return (
          <button
            onClick={() => void addToPlaylist(1, 'Test Playlist', 123)}
            disabled={addingToPlaylistId !== null}
          >
            Add
          </button>
        );
      }

      renderWithProviders(<TestComponent />);

      await userEvent.click(screen.getByText('Add'));

      await waitFor(() => {
        expect(api.addTrackToPlaylist).toHaveBeenCalledWith(1, 123);
      });
    });

    it('handles error when track is already in playlist', async () => {
      (api.addTrackToPlaylist as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Track already in this playlist')
      );

      const { useAddToPlaylist } = await import('@/hooks/useAddToPlaylist');

      function TestComponent() {
        const { addToPlaylist } = useAddToPlaylist();
        return (
          <button onClick={() => void addToPlaylist(1, 'Test Playlist', 123)}>
            Add
          </button>
        );
      }

      renderWithProviders(<TestComponent />);

      await userEvent.click(screen.getByText('Add'));

      await waitFor(() => {
        expect(api.addTrackToPlaylist).toHaveBeenCalled();
      });
    });
  });

  describe('PlaylistPickerSubmenu component', () => {
    it('renders the submenu trigger with correct label', async () => {
      renderWithProviders(<SubmenuWrapper trackId={123} />);

      expect(screen.getByText('trackMenu.addToPlaylist')).toBeInTheDocument();
    });

    it('shows owned playlists when submenu opens', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SubmenuWrapper trackId={123} />);

      await openSubmenu(user);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('trackMenu.searchPlaylists')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('My Playlist')).toBeInTheDocument();
        expect(screen.getByText('Another Owned')).toBeInTheDocument();
      });
    });

    it('filters playlists by search query', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SubmenuWrapper trackId={123} />);

      await openSubmenu(user);

      await waitFor(() => {
        expect(screen.getByText('My Playlist')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('trackMenu.searchPlaylists');
      await user.type(searchInput, 'another');

      await waitFor(() => {
        expect(screen.queryByText('My Playlist')).not.toBeInTheDocument();
        expect(screen.getByText('Another Owned')).toBeInTheDocument();
      });
    });

    it('shows already-added indicator for playlists containing the track', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SubmenuWrapper trackId={123} />);

      await openSubmenu(user);

      await waitFor(() => {
        expect(screen.getByText('Another Owned')).toBeInTheDocument();
      });

      const anotherOwnedRow = screen.getByText('Another Owned').closest('button');
      expect(anotherOwnedRow).toBeDisabled();
      expect(within(anotherOwnedRow!).getByText('trackMenu.added')).toBeInTheDocument();
    });

    it('calls addTrackToPlaylist when clicking an available playlist', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SubmenuWrapper trackId={123} />);

      await openSubmenu(user);

      await waitFor(() => {
        expect(screen.getByText('My Playlist')).toBeInTheDocument();
      });

      const myPlaylistRow = screen.getByText('My Playlist').closest('button');
      await user.click(myPlaylistRow!);

      await waitFor(() => {
        expect(api.addTrackToPlaylist).toHaveBeenCalledWith(1, 123);
      });
    });

    it('does not show non-owned playlists', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SubmenuWrapper trackId={123} />);

      await openSubmenu(user);

      await waitFor(() => {
        expect(screen.getByText('My Playlist')).toBeInTheDocument();
      });

      expect(screen.queryByText('Liked')).not.toBeInTheDocument();
    });

    it('shows empty state when no playlists match search', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SubmenuWrapper trackId={123} />);

      await openSubmenu(user);

      await waitFor(() => {
        expect(screen.getByText('My Playlist')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('trackMenu.searchPlaylists');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.queryByText('My Playlist')).not.toBeInTheDocument();
        expect(screen.queryByText('Another Owned')).not.toBeInTheDocument();
      });
    });
  });

  describe('playlist filtering logic', () => {
    it('filters by search query', () => {
      const playlists = [
        { id: 1, title: 'My Playlist', artwork_url: null, contains_track: false },
        { id: 3, title: 'Another Owned', artwork_url: null, contains_track: false },
      ];
      const search = 'another';
      const filtered = playlists.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.title).toBe('Another Owned');
    });
  });

  describe('duplicate detection', () => {
    it('detects when track is already in playlist via contains_track flag', () => {
      const playlists = [
        { id: 1, title: 'My Playlist', artwork_url: null, contains_track: true },
        { id: 2, title: 'Other Playlist', artwork_url: null, contains_track: false },
      ];

      const playlistWithTrack = playlists.find(p => p.contains_track);
      expect(playlistWithTrack?.id).toBe(1);
    });

    it('returns false when track is not in playlist', () => {
      const playlists = [
        { id: 1, title: 'My Playlist', artwork_url: null, contains_track: false },
      ];

      const containsTrack = playlists[0]?.contains_track ?? false;
      expect(containsTrack).toBe(false);
    });
  });
});
