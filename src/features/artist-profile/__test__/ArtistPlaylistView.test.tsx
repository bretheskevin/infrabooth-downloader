import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArtistPlaylistView } from '../components/ArtistPlaylistView';
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
  getArtworkUrl: (url: string | null) => url,
}));

const mockUseArtistPlaylistTracks = vi.fn();

vi.mock('../hooks/useArtistPlaylistTracks', () => ({
  useArtistPlaylistTracks: (...args: unknown[]) => mockUseArtistPlaylistTracks(...args),
}));

vi.mock('@/components/track-list/TrackListView', () => ({
  TrackListView: ({ title, messages }: { title: string; messages: { empty: string } }) => (
    <div data-testid="track-list-view">
      <span>{title}</span>
      <span>{messages.empty}</span>
    </div>
  ),
}));

vi.mock('@/components/DetailHeader', () => ({
  DetailHeader: ({ title }: { title: string }) => <div data-testid="detail-header">{title}</div>,
}));

vi.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: { label: string }[] }) => (
    <nav data-testid="breadcrumb">{items.map((i) => i.label).join(' > ')}</nav>
  ),
}));

const mockPlaylist: ArtistPlaylist = {
  id: 42,
  title: 'Cool Playlist',
  artwork_url: 'https://example.com/art.jpg',
  track_count: 8,
  created_at: '2026-01-01T00:00:00Z',
  permalink_url: 'https://soundcloud.com/user/sets/cool',
};

describe('ArtistPlaylistView', () => {
  const defaults = {
    playlist: mockPlaylist,
    artistName: 'Test Artist',
    onBack: vi.fn(),
    onDownloadTracks: vi.fn(),
  };

  it('passes playlist title to layout', () => {
    mockUseArtistPlaylistTracks.mockReturnValue({
      data: undefined,
      isLoading: true,
      isStreaming: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ArtistPlaylistView {...defaults} />);
    expect(screen.getByText('Cool Playlist')).toBeInTheDocument();
  });

  it('calls hook with playlist id', () => {
    mockUseArtistPlaylistTracks.mockReturnValue({
      data: undefined,
      isLoading: false,
      isStreaming: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ArtistPlaylistView {...defaults} />);
    expect(mockUseArtistPlaylistTracks).toHaveBeenCalledWith(42);
  });
});
