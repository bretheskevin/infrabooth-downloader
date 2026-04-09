import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PlaylistCard } from '../components/PlaylistCard';
import type { ArtistPlaylist } from '@/bindings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'artistProfile.playlistTrackCount') return `${opts?.count} tracks`;
      return key;
    },
  }),
}));

vi.mock('@/lib/soundcloud', () => ({
  getArtworkUrl: (url: string | null) => (url ? `${url}-resized` : null),
}));

vi.mock('@/lib/date', () => ({
  formatRelativeTime: () => '2 days ago',
}));

const mockPlaylist: ArtistPlaylist = {
  id: 123,
  title: 'My Cool Playlist',
  artwork_url: 'https://example.com/art.jpg',
  track_count: 12,
  created_at: '2026-01-15T10:00:00Z',
  permalink_url: 'https://soundcloud.com/user/sets/my-cool-playlist',
};

describe('PlaylistCard', () => {
  it('renders playlist title and track count', () => {
    render(<PlaylistCard playlist={mockPlaylist} onClick={() => {}} />);
    expect(screen.getByText('My Cool Playlist')).toBeInTheDocument();
    expect(screen.getByText('12 tracks')).toBeInTheDocument();
  });

  it('renders artwork image', () => {
    render(<PlaylistCard playlist={mockPlaylist} onClick={() => {}} />);
    const img = screen.getByAltText('My Cool Playlist');
    expect(img).toHaveAttribute('src', 'https://example.com/art.jpg-resized');
  });

  it('renders fallback when no artwork', () => {
    const noArt = { ...mockPlaylist, artwork_url: null };
    render(<PlaylistCard playlist={noArt} onClick={() => {}} />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<PlaylistCard playlist={mockPlaylist} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
