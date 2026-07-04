import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TrackInfo } from '@/bindings';
import { EditPlaylistDialog } from '@/components/playlist-detail/EditPlaylistDialog';

const mockEditPlaylist = vi.fn();
vi.mock('@/hooks/useEditPlaylist', () => ({
  useEditPlaylist: (onSuccess?: () => void) => ({
    editPlaylist: async (...args: unknown[]) => {
      const result = await mockEditPlaylist(...args);
      if (result) onSuccess?.();
      return result;
    },
    isEditing: false,
  }),
}));

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

const mockTracks: TrackInfo[] = [
  {
    id: 1,
    title: 'Track One',
    user: { id: 10, username: 'Artist A', avatar_url: null },
    artwork_url: null,
    duration: 120000,
    permalink_url: 'https://soundcloud.com/a/track-one',
    waveform_url: null,
    downloadable: false,
    download_url: null,
    secret_token: null,
  },
  {
    id: 2,
    title: 'Track Two',
    user: { id: 20, username: 'Artist B', avatar_url: null },
    artwork_url: null,
    duration: 180000,
    permalink_url: 'https://soundcloud.com/b/track-two',
    waveform_url: null,
    downloadable: false,
    download_url: null,
    secret_token: null,
  },
  {
    id: 3,
    title: 'Track Three',
    user: { id: 30, username: 'Artist C', avatar_url: null },
    artwork_url: null,
    duration: 240000,
    permalink_url: 'https://soundcloud.com/c/track-three',
    waveform_url: null,
    downloadable: false,
    download_url: null,
    secret_token: null,
  },
];

function renderDialog(props: Partial<React.ComponentProps<typeof EditPlaylistDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    playlistId: 42,
    initialTitle: 'My Playlist',
    initialIsPublic: false,
    isPublicKnown: true,
    tracksReady: true,
    tracks: mockTracks,
    ...props,
  };

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <EditPlaylistDialog {...defaultProps} />
      </QueryClientProvider>,
    ),
    props: defaultProps,
  };
}

describe('EditPlaylistDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditPlaylist.mockResolvedValue(true);
  });

  it('renders initial title in input', () => {
    renderDialog();
    expect(screen.getByDisplayValue('My Playlist')).toBeInTheDocument();
  });

  it('renders all tracks', () => {
    renderDialog();
    expect(screen.getByText('Track One')).toBeInTheDocument();
    expect(screen.getByText('Track Two')).toBeInTheDocument();
    expect(screen.getByText('Track Three')).toBeInTheDocument();
  });

  it('shows private label when initialIsPublic is false', () => {
    renderDialog({ initialIsPublic: false });
    expect(screen.getByText('trackMenu.private')).toBeInTheDocument();
  });

  it('shows public label when initialIsPublic is true', () => {
    renderDialog({ initialIsPublic: true });
    expect(screen.getByText('trackMenu.public')).toBeInTheDocument();
  });

  it('disables Save when title is cleared', async () => {
    const user = userEvent.setup();
    renderDialog();
    const input = screen.getByDisplayValue('My Playlist');
    await user.clear(input);
    const saveBtn = screen.getByRole('button', { name: 'playlistMenu.save' });
    expect(saveBtn).toBeDisabled();
  });

  it('calls editPlaylist with correct args on save', async () => {
    const user = userEvent.setup();
    renderDialog();
    const saveBtn = screen.getByRole('button', { name: 'playlistMenu.save' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockEditPlaylist).toHaveBeenCalledWith({
        playlistId: 42,
        title: 'My Playlist',
        sharing: 'private',
        trackIds: [1, 2, 3],
      });
    });
  });

  it('sends sharing public when switch is flipped', async () => {
    const user = userEvent.setup();
    renderDialog();
    const switchEl = screen.getByRole('switch');
    await user.click(switchEl);
    const saveBtn = screen.getByRole('button', { name: 'playlistMenu.save' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockEditPlaylist).toHaveBeenCalledWith(expect.objectContaining({ sharing: 'public' }));
    });
  });

  it('removes second track and sends trackIds [1, 3]', async () => {
    const user = userEvent.setup();
    renderDialog();
    const removeButtons = screen.getAllByRole('button', { name: 'playlistMenu.removeTrack' });
    await user.click(removeButtons[1]!);
    const saveBtn = screen.getByRole('button', { name: 'playlistMenu.save' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockEditPlaylist).toHaveBeenCalledWith(expect.objectContaining({ trackIds: [1, 3] }));
    });
  });

  it('undo after remove restores full track list', async () => {
    const user = userEvent.setup();
    renderDialog();
    const removeButtons = screen.getAllByRole('button', { name: 'playlistMenu.removeTrack' });
    await user.click(removeButtons[1]!);
    const undoBtn = screen.getByRole('button', { name: 'playlistMenu.undoRemove' });
    await user.click(undoBtn);
    const saveBtn = screen.getByRole('button', { name: 'playlistMenu.save' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockEditPlaylist).toHaveBeenCalledWith(expect.objectContaining({ trackIds: [1, 2, 3] }));
    });
  });

  it('closes the dialog after successful save', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });
    const saveBtn = screen.getByRole('button', { name: 'playlistMenu.save' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('hides the visibility toggle and sends null sharing when public state is unknown', async () => {
    const user = userEvent.setup();
    renderDialog({ isPublicKnown: false });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: 'playlistMenu.save' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockEditPlaylist).toHaveBeenCalledWith(expect.objectContaining({ sharing: null }));
    });
  });

  it('disables Save while tracks are still loading', () => {
    renderDialog({ tracksReady: false });
    expect(screen.getByRole('button', { name: 'playlistMenu.save' })).toBeDisabled();
  });

  it('calls onSaved with title and isPublic after successful save', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    renderDialog({ onSaved, initialIsPublic: true });
    const saveBtn = screen.getByRole('button', { name: 'playlistMenu.save' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith('My Playlist', true);
    });
  });

  it('does not call onSaved when save fails', async () => {
    mockEditPlaylist.mockResolvedValue(false);
    const user = userEvent.setup();
    const onSaved = vi.fn();
    renderDialog({ onSaved });
    const saveBtn = screen.getByRole('button', { name: 'playlistMenu.save' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockEditPlaylist).toHaveBeenCalled();
    });
    expect(onSaved).not.toHaveBeenCalled();
  });
});
