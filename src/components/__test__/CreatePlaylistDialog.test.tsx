import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreatePlaylistDialog } from '@/components/CreatePlaylistDialog';

const mockCreatePlaylist = vi.fn();
vi.mock('@/hooks/useCreatePlaylist', () => ({
  useCreatePlaylist: (onSuccess?: () => void) => ({
    createPlaylist: async (...args: unknown[]) => {
      const result = await mockCreatePlaylist(...args);
      if (result) onSuccess?.();
      return result;
    },
    isCreating: false,
  }),
}));

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

function renderDialog(props: Partial<React.ComponentProps<typeof CreatePlaylistDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    trackId: 42,
    defaultName: '',
    ...props,
  };

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <CreatePlaylistDialog {...defaultProps} />
      </QueryClientProvider>,
    ),
    props: defaultProps,
  };
}

describe('CreatePlaylistDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePlaylist.mockResolvedValue(true);
  });

  it('renders dialog with title and input', () => {
    renderDialog();
    expect(screen.getByRole('heading', { name: 'trackMenu.createPlaylist' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('trackMenu.playlistName')).toBeInTheDocument();
  });

  it('pre-fills input with defaultName', () => {
    renderDialog({ defaultName: 'My Search' });
    expect(screen.getByPlaceholderText('trackMenu.playlistName')).toHaveValue('My Search');
  });

  it('disables create button when name is empty', () => {
    renderDialog();
    const createBtn = screen.getByRole('button', { name: 'trackMenu.createPlaylist' });
    expect(createBtn).toBeDisabled();
  });

  it('enables create button when name is entered', async () => {
    const user = userEvent.setup();
    renderDialog();
    const input = screen.getByPlaceholderText('trackMenu.playlistName');
    await user.type(input, 'New Playlist');
    const createBtn = screen.getByRole('button', { name: 'trackMenu.createPlaylist' });
    expect(createBtn).not.toBeDisabled();
  });

  it('calls createPlaylist with correct args on submit', async () => {
    const user = userEvent.setup();
    renderDialog();
    const input = screen.getByPlaceholderText('trackMenu.playlistName');
    await user.type(input, 'Cool Playlist');
    const createBtn = screen.getByRole('button', { name: 'trackMenu.createPlaylist' });
    await user.click(createBtn);

    await waitFor(() => {
      expect(mockCreatePlaylist).toHaveBeenCalledWith('Cool Playlist', 'private', 42);
    });
  });

  it('passes public sharing when switch is toggled', async () => {
    const user = userEvent.setup();
    renderDialog();
    const input = screen.getByPlaceholderText('trackMenu.playlistName');
    await user.type(input, 'Public Playlist');
    const switchEl = screen.getByRole('switch');
    await user.click(switchEl);
    const createBtn = screen.getByRole('button', { name: 'trackMenu.createPlaylist' });
    await user.click(createBtn);

    await waitFor(() => {
      expect(mockCreatePlaylist).toHaveBeenCalledWith('Public Playlist', 'public', 42);
    });
  });

  it('calls onSuccess callback after successful creation', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderDialog({ onSuccess });
    const input = screen.getByPlaceholderText('trackMenu.playlistName');
    await user.type(input, 'Test');
    const createBtn = screen.getByRole('button', { name: 'trackMenu.createPlaylist' });
    await user.click(createBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows private label by default', () => {
    renderDialog();
    expect(screen.getByText('trackMenu.private')).toBeInTheDocument();
  });

  it('shows public label when switch is toggled', async () => {
    const user = userEvent.setup();
    renderDialog();
    const switchEl = screen.getByRole('switch');
    await user.click(switchEl);
    expect(screen.getByText('trackMenu.public')).toBeInTheDocument();
  });
});
