import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaylistSearchResultItem } from '../components/PlaylistSearchResultItem';
import type { ArtistPlaylist } from '@/bindings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'search.playlistTrackCount') return `${opts?.count} tracks`;
      return key;
    },
  }),
}));

vi.mock('@/features/artist-profile/components/PlaylistArtwork', () => ({
  PlaylistArtwork: ({ title }: { title: string }) => <div data-testid="playlist-artwork">{title}</div>,
}));

const mockOpenPlaylist = vi.fn();
vi.mock('../selected-playlist-store', () => ({
  useSelectedPlaylistStore: {
    getState: () => ({ openPlaylist: mockOpenPlaylist }),
  },
}));

const mockPlaylist: ArtistPlaylist = {
  id: 123,
  title: 'Chill Vibes',
  artwork_url: 'https://i1.sndcdn.com/artworks-abc.jpg',
  track_count: 15,
  created_at: '2026-01-01T00:00:00Z',
  permalink_url: 'https://soundcloud.com/user/sets/chill-vibes',
  secret_token: null,
  duration: 3600,
  user: { id: 456, username: 'ChillUser' },
};

describe('PlaylistSearchResultItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders playlist info', () => {
    render(<PlaylistSearchResultItem playlist={mockPlaylist} />);
    expect(screen.getAllByText('Chill Vibes')).toHaveLength(2);
    expect(screen.getByText('15 tracks')).toBeInTheDocument();
    expect(screen.getByText('ChillUser')).toBeInTheDocument();
  });

  it('renders playlist artwork', () => {
    render(<PlaylistSearchResultItem playlist={mockPlaylist} />);
    expect(screen.getByTestId('playlist-artwork')).toHaveTextContent('Chill Vibes');
  });

  it('hides owner when user is absent', () => {
    render(<PlaylistSearchResultItem playlist={{ ...mockPlaylist, user: null }} />);
    expect(screen.getByText('15 tracks')).toBeInTheDocument();
    expect(screen.queryByText('ChillUser')).not.toBeInTheDocument();
  });

  it('opens playlist overlay on click', async () => {
    render(<PlaylistSearchResultItem playlist={mockPlaylist} />);
    const elements = screen.getAllByText('Chill Vibes');
    await userEvent.click(elements[0]!);
    expect(mockOpenPlaylist).toHaveBeenCalledWith(mockPlaylist);
  });
});
