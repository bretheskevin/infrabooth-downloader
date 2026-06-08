import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaylistSearchResultList } from '../components/PlaylistSearchResultList';
import type { SearchQueryState } from '../hooks/useInfiniteSearchQuery';
import type { ArtistPlaylist } from '@/bindings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'search.emptyStatePlaylists': 'Search for playlists on SoundCloud',
        'search.noPlaylistResults': 'No playlists found',
        'search.errorSearch': 'Search failed',
        'search.rateLimited': 'Rate limit reached',
        'search.playlistTrackCount': 'tracks',
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null } }),
}));

vi.mock('../selected-playlist-store', () => ({
  useSelectedPlaylistStore: {
    getState: () => ({ openPlaylist: vi.fn() }),
  },
}));

vi.mock('@/features/artist-profile/components/PlaylistArtwork', () => ({
  PlaylistArtwork: ({ title }: { title: string }) => <div>{title}</div>,
}));

const mockPlaylist: ArtistPlaylist = {
  id: 1,
  title: 'TestPlaylist',
  artwork_url: null,
  track_count: 10,
  created_at: '2026-01-01T00:00:00Z',
  permalink_url: 'https://soundcloud.com/user/sets/test',
  secret_token: null,
  duration: 3600,
  user: { id: 100, username: 'TestUser' },
};

const makeQuery = (overrides: Partial<SearchQueryState<ArtistPlaylist>> = {}): SearchQueryState<ArtistPlaylist> => ({
  results: [],
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage: vi.fn(),
  error: null,
  hasSearched: false,
  ...overrides,
});

describe('PlaylistSearchResultList', () => {
  it('renders empty state when not searched', () => {
    render(<PlaylistSearchResultList query={makeQuery()} />);
    expect(screen.getByText('Search for playlists on SoundCloud')).toBeInTheDocument();
  });

  it('renders loading spinner', () => {
    render(<PlaylistSearchResultList query={makeQuery({ hasSearched: true, isLoading: true })} />);
    expect(screen.queryByText('Search for playlists on SoundCloud')).not.toBeInTheDocument();
  });

  it('renders no results message', () => {
    render(<PlaylistSearchResultList query={makeQuery({ hasSearched: true, results: [] })} />);
    expect(screen.getByText('No playlists found')).toBeInTheDocument();
  });

  it('renders playlist items', () => {
    render(<PlaylistSearchResultList query={makeQuery({ hasSearched: true, results: [mockPlaylist] })} />);
    expect(screen.getAllByText('TestPlaylist').length).toBeGreaterThan(0);
  });

  it('renders error message', () => {
    render(<PlaylistSearchResultList query={makeQuery({ hasSearched: true, error: new Error('fail') })} />);
    expect(screen.getByText('Search failed')).toBeInTheDocument();
  });
});
