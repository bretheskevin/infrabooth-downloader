import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtistSearchResultList } from '../components/ArtistSearchResultList';
import type { UserSearchResult } from '@/bindings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'search.emptyStateArtists': 'Search for artists on SoundCloud',
        'search.noArtistResults': 'No artists found',
        'search.errorSearch': 'Search failed',
        'search.rateLimited': 'Rate limit reached',
        'search.followers': 'followers',
        'search.tracks': 'tracks',
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null } }),
}));

vi.mock('@/features/artist-profile/store', () => ({
  useArtistProfileStore: {
    getState: () => ({ openProfile: vi.fn() }),
  },
}));

const mockArtist: UserSearchResult = {
  id: 1,
  username: 'TestArtist',
  avatar_url: null,
  followers_count: 100,
  track_count: 10,
  permalink_url: 'https://soundcloud.com/testartist',
};

const defaultProps = {
  results: [] as UserSearchResult[],
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage: vi.fn(),
  error: null,
  hasSearched: false,
};

describe('ArtistSearchResultList', () => {
  it('renders empty state when not searched', () => {
    render(<ArtistSearchResultList {...defaultProps} />);
    expect(screen.getByText('Search for artists on SoundCloud')).toBeInTheDocument();
  });

  it('renders loading spinner', () => {
    render(<ArtistSearchResultList {...defaultProps} hasSearched isLoading />);
    expect(screen.queryByText('Search for artists on SoundCloud')).not.toBeInTheDocument();
  });

  it('renders no results message', () => {
    render(<ArtistSearchResultList {...defaultProps} hasSearched results={[]} />);
    expect(screen.getByText('No artists found')).toBeInTheDocument();
  });

  it('renders artist items', () => {
    render(<ArtistSearchResultList {...defaultProps} hasSearched results={[mockArtist]} />);
    expect(screen.getByText('TestArtist')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<ArtistSearchResultList {...defaultProps} hasSearched error={new Error('fail')} />);
    expect(screen.getByText('Search failed')).toBeInTheDocument();
  });
});
