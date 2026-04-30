import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LibraryPlaylistList } from '../LibraryPlaylistList';
import type { LibraryPlaylist } from '@/bindings';

let mockIsWidescreen = false;

vi.mock('@/hooks/useIsWidescreen', () => ({
  useIsWidescreen: () => mockIsWidescreen,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (key === 'download.trackCount') return `${opts?.count} tracks`;
      if (key === 'library.noResults') return 'No results';
      if (key === 'library.emptyState') return 'Empty';
      return key;
    },
  }),
}));

vi.mock('../../hooks/usePlaylistArtwork', () => ({
  usePlaylistArtwork: () => ({ data: undefined }),
}));

vi.mock('@/features/artist-profile/store', () => ({
  useArtistProfileStore: { getState: () => ({ openProfile: vi.fn() }) },
}));

vi.mock('@/hooks/useVirtualizedList', () => ({
  useVirtualizedList: ({ count }: { count: number }) => ({
    parentRef: { current: null },
    virtualItems: Array.from({ length: count }, (_, i) => ({
      index: i,
      size: 68,
      start: i * 68,
    })),
    totalSize: count * 68,
    getScrollOffset: () => 0,
  }),
}));

vi.mock('@/components/ui/virtual-list', () => ({
  VirtualListContainer: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="virtual-list-container" className={className}>{children}</div>
  ),
  VirtualRow: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="virtual-row">{children}</div>
  ),
}));

const makePlaylists = (count: number): LibraryPlaylist[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Playlist ${i + 1}`,
    username: 'User',
    user_id: 1,
    artwork_url: null,
    track_count: 5,
    duration: 60000,
    permalink_url: `https://soundcloud.com/test/sets/p${i + 1}`,
    is_owned: true,
    is_public: true,
    secret_token: null,
  }));

describe('LibraryPlaylistList', () => {
  const defaultProps = {
    playlists: makePlaylists(3),
    isLoading: false,
    error: null,
    isEmpty: false,
    isFiltered: false,
    onOpenDetail: vi.fn(),
    onDownload: vi.fn(),
    downloadingPlaylistId: null,
    onRetry: vi.fn(),
  };

  beforeEach(() => {
    mockIsWidescreen = false;
  });

  it('uses virtualized list in narrow mode', () => {
    render(<LibraryPlaylistList {...defaultProps} />);
    expect(screen.getByTestId('virtual-list-container')).toBeInTheDocument();
  });

  it('uses grid layout in widescreen mode', () => {
    mockIsWidescreen = true;
    render(<LibraryPlaylistList {...defaultProps} />);
    expect(screen.queryByTestId('virtual-list-container')).not.toBeInTheDocument();
    const grid = screen.getByTestId('widescreen-grid');
    expect(grid.className).toContain('grid');
  });

  it('applies animateRefresh class to grid in widescreen mode', () => {
    mockIsWidescreen = true;
    render(<LibraryPlaylistList {...defaultProps} animateRefresh />);
    const grid = screen.getByTestId('widescreen-grid');
    expect(grid.className).toContain('library-list-refresh');
  });

  it('renders all playlists in widescreen grid without virtualization', () => {
    mockIsWidescreen = true;
    render(<LibraryPlaylistList {...defaultProps} />);
    expect(screen.queryAllByTestId('virtual-row')).toHaveLength(0);
    expect(screen.getByText('Playlist 1')).toBeInTheDocument();
    expect(screen.getByText('Playlist 2')).toBeInTheDocument();
    expect(screen.getByText('Playlist 3')).toBeInTheDocument();
  });
});
