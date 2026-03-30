import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtistSearchResultItem } from '../components/ArtistSearchResultItem';
import type { UserSearchResult } from '@/bindings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => {
    if (key === 'search.followers') return `${opts?.value} followers`;
    if (key === 'search.tracks') return `${opts?.value} tracks`;
    return key;
  }}),
}));

const mockOpenProfile = vi.fn();
vi.mock('@/features/artist-profile/store', () => ({
  useArtistProfileStore: {
    getState: () => ({ openProfile: mockOpenProfile }),
  },
}));

const mockArtist: UserSearchResult = {
  id: 123,
  username: 'TestArtist',
  avatar_url: 'https://i1.sndcdn.com/avatars-abc.jpg',
  followers_count: 12300,
  track_count: 42,
  permalink_url: 'https://soundcloud.com/testartist',
};

describe('ArtistSearchResultItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders artist info', () => {
    render(<ArtistSearchResultItem artist={mockArtist} />);
    expect(screen.getByText('TestArtist')).toBeInTheDocument();
    expect(screen.getByText('12.3K followers')).toBeInTheDocument();
    expect(screen.getByText('42 tracks')).toBeInTheDocument();
  });

  it('renders avatar image', () => {
    render(<ArtistSearchResultItem artist={mockArtist} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://i1.sndcdn.com/avatars-abc.jpg');
    expect(img).toHaveAttribute('alt', 'TestArtist');
  });

  it('renders fallback when no avatar', () => {
    render(<ArtistSearchResultItem artist={{ ...mockArtist, avatar_url: null }} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('opens artist profile on click', () => {
    render(<ArtistSearchResultItem artist={mockArtist} />);
    fireEvent.click(screen.getByText('TestArtist'));
    expect(mockOpenProfile).toHaveBeenCalledWith(123, 'TestArtist');
  });
});
