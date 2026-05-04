import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ArtistProfile } from '@/bindings';
import { ArtistFollowList } from '../components/ArtistFollowList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/useVirtualizedList', () => ({
  useVirtualizedList: ({ count }: { count: number }) => ({
    parentRef: { current: null },
    virtualItems: Array.from({ length: count }, (_, i) => ({
      index: i,
      size: 44,
      start: i * 44,
    })),
    totalSize: count * 44,
  }),
}));

vi.mock('@/components/ui/virtual-list', () => ({
  VirtualListContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="virtual-list">{children}</div>,
  VirtualRow: ({ children }: { children: React.ReactNode }) => <div data-testid="virtual-row">{children}</div>,
}));

const mockGoBack = vi.fn();
const mockOpenProfile = vi.fn();
vi.mock('../store', () => ({
  useArtistProfileStore: { getState: () => ({ goBack: mockGoBack, openProfile: mockOpenProfile }) },
}));

vi.mock('@/lib/soundcloud', () => ({
  getArtworkUrl: (url: string | null) => url,
}));

const mockFollowListState = {
  data: undefined as ArtistProfile[] | undefined,
  isLoading: false,
  isStreaming: false,
  error: null as Error | null,
  refetch: vi.fn(),
};

vi.mock('../hooks/useArtistFollowList', () => ({
  useArtistFollowList: () => mockFollowListState,
}));

const mockArtists: ArtistProfile[] = [
  {
    id: 1,
    username: 'Alpha Artist',
    avatar_url: 'https://example.com/alpha.jpg',
    description: null,
    followers_count: 5000,
    followings_count: 100,
    track_count: 20,
    permalink_url: 'https://soundcloud.com/alpha',
    visuals: null,
  },
  {
    id: 2,
    username: 'Beta Producer',
    avatar_url: 'https://example.com/beta.jpg',
    description: null,
    followers_count: 12000,
    followings_count: 50,
    track_count: 35,
    permalink_url: 'https://soundcloud.com/beta',
    visuals: null,
  },
  {
    id: 3,
    username: 'Gamma DJ',
    avatar_url: null,
    description: null,
    followers_count: 800,
    followings_count: 200,
    track_count: 5,
    permalink_url: 'https://soundcloud.com/gamma',
    visuals: null,
  },
];

describe('ArtistFollowList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFollowListState.data = undefined;
    mockFollowListState.isLoading = false;
    mockFollowListState.isStreaming = false;
    mockFollowListState.error = null;
  });

  it('renders loading skeletons when loading', () => {
    mockFollowListState.isLoading = true;
    const { container } = render(<ArtistFollowList type="followers" artistId={42} artistName="DJ Test" />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error state with refresh button', () => {
    mockFollowListState.error = new Error('Network error');
    render(<ArtistFollowList type="followers" artistId={42} artistName="DJ Test" />);
    expect(screen.getByText('artistProfile.error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeInTheDocument();
  });

  it('renders empty state for followers when no data', () => {
    mockFollowListState.data = [];
    render(<ArtistFollowList type="followers" artistId={42} artistName="DJ Test" />);
    expect(screen.getByText('artistProfile.noFollowersResults')).toBeInTheDocument();
  });

  it('renders empty state for followings when no data', () => {
    mockFollowListState.data = [];
    render(<ArtistFollowList type="followings" artistId={42} artistName="DJ Test" />);
    expect(screen.getByText('artistProfile.noFollowingsResults')).toBeInTheDocument();
  });

  it('renders artist rows when data is loaded', () => {
    mockFollowListState.data = mockArtists;
    render(<ArtistFollowList type="followers" artistId={42} artistName="DJ Test" />);
    expect(screen.getByText('Alpha Artist')).toBeInTheDocument();
    expect(screen.getByText('Beta Producer')).toBeInTheDocument();
    expect(screen.getByText('Gamma DJ')).toBeInTheDocument();
  });

  it('filters artists by search query', async () => {
    mockFollowListState.data = mockArtists;
    render(<ArtistFollowList type="followers" artistId={42} artistName="DJ Test" />);

    const searchInput = screen.getByPlaceholderText('artistProfile.searchFollowers');
    await userEvent.type(searchInput, 'beta');

    expect(screen.queryByText('Alpha Artist')).not.toBeInTheDocument();
    expect(screen.getByText('Beta Producer')).toBeInTheDocument();
    expect(screen.queryByText('Gamma DJ')).not.toBeInTheDocument();
  });

  it('shows streaming indicator when streaming', () => {
    mockFollowListState.data = mockArtists;
    mockFollowListState.isStreaming = true;
    const { container } = render(<ArtistFollowList type="followers" artistId={42} artistName="DJ Test" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('does not show empty state while streaming', () => {
    mockFollowListState.data = [];
    mockFollowListState.isStreaming = true;
    render(<ArtistFollowList type="followers" artistId={42} artistName="DJ Test" />);
    expect(screen.queryByText('artistProfile.noFollowersResults')).not.toBeInTheDocument();
  });

  it('calls goBack when breadcrumb artist name is clicked', async () => {
    mockFollowListState.data = [];
    render(<ArtistFollowList type="followers" artistId={42} artistName="DJ Test" />);
    await userEvent.click(screen.getByText('DJ Test'));
    expect(mockGoBack).toHaveBeenCalledOnce();
  });

  it('uses correct search placeholder for followings', () => {
    mockFollowListState.data = [];
    render(<ArtistFollowList type="followings" artistId={42} artistName="DJ Test" />);
    expect(screen.getByPlaceholderText('artistProfile.searchFollowings')).toBeInTheDocument();
  });

  it('opens profile when clicking an artist row', async () => {
    mockFollowListState.data = mockArtists;
    render(<ArtistFollowList type="followers" artistId={42} artistName="DJ Test" />);
    await userEvent.click(screen.getByText('Alpha Artist'));
    expect(mockOpenProfile).toHaveBeenCalledWith(1, 'Alpha Artist');
  });

  it('uses virtualized list container', () => {
    mockFollowListState.data = mockArtists;
    render(<ArtistFollowList type="followers" artistId={42} artistName="DJ Test" />);
    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('virtual-row')).toHaveLength(3);
  });
});
