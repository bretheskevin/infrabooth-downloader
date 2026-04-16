import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PlaylistGrid } from '../components/PlaylistGrid';
import type { ArtistPlaylist } from '@/bindings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/soundcloud', () => ({
  getArtworkUrl: (url: string | null) => url,
}));

vi.mock('@/lib/date', () => ({
  formatRelativeTime: () => '1 day ago',
}));

const mockPlaylists: ArtistPlaylist[] = [
  {
    id: 1,
    title: 'Playlist One',
    artwork_url: 'https://example.com/1.jpg',
    track_count: 5,
    created_at: '2026-01-01T00:00:00Z',
    permalink_url: 'https://soundcloud.com/user/sets/one',
    secret_token: null,
  },
  {
    id: 2,
    title: 'Playlist Two',
    artwork_url: null,
    track_count: 10,
    created_at: '2026-02-01T00:00:00Z',
    permalink_url: 'https://soundcloud.com/user/sets/two',
    secret_token: null,
  },
];

const mockUseArtistPlaylists = vi.fn();

vi.mock('../hooks/useArtistPlaylists', () => ({
  useArtistPlaylists: (...args: unknown[]) => mockUseArtistPlaylists(...args),
}));

describe('PlaylistGrid', () => {
  it('renders loading skeleton', () => {
    mockUseArtistPlaylists.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { container } = render(<PlaylistGrid artistId={123} onSelectPlaylist={() => {}} />);
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });

  it('renders empty state when no playlists', () => {
    mockUseArtistPlaylists.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<PlaylistGrid artistId={123} onSelectPlaylist={() => {}} />);
    expect(screen.getByText('artistProfile.noPlaylists')).toBeInTheDocument();
  });

  it('renders playlist cards', () => {
    mockUseArtistPlaylists.mockReturnValue({ data: mockPlaylists, isLoading: false, error: null });
    render(<PlaylistGrid artistId={123} onSelectPlaylist={() => {}} />);
    expect(screen.getByText('Playlist One')).toBeInTheDocument();
    expect(screen.getByText('Playlist Two')).toBeInTheDocument();
  });

  it('calls onSelectPlaylist when card is clicked', async () => {
    mockUseArtistPlaylists.mockReturnValue({ data: mockPlaylists, isLoading: false, error: null });
    const onSelect = vi.fn();
    render(<PlaylistGrid artistId={123} onSelectPlaylist={onSelect} />);
    await userEvent.click(screen.getByText('Playlist One'));
    expect(onSelect).toHaveBeenCalledWith(mockPlaylists[0]);
  });

  it('renders error state with refresh button', () => {
    const refetch = vi.fn();
    mockUseArtistPlaylists.mockReturnValue({ data: undefined, isLoading: false, error: new Error('fail'), refetch });
    render(<PlaylistGrid artistId={123} onSelectPlaylist={() => {}} />);
    expect(screen.getByText('artistProfile.playlistsError')).toBeInTheDocument();
  });
});
