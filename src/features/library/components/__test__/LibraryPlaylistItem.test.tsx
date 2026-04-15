import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryPlaylistItem } from '../LibraryPlaylistItem';
import type { LibraryPlaylist } from '@/bindings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (key === 'download.trackCount') return `${opts?.count} tracks`;
      return key;
    },
  }),
}));

vi.mock('../../hooks/usePlaylistArtwork', () => ({
  usePlaylistArtwork: () => ({ data: undefined }),
}));

const mockOpenProfile = vi.fn();
vi.mock('@/features/artist-profile/store', () => ({
  useArtistProfileStore: { getState: () => ({ openProfile: mockOpenProfile }) },
}));

const mockPlaylist: LibraryPlaylist = {
  id: 1,
  title: 'Test Playlist',
  username: 'TestUser',
  user_id: 99,
  artwork_url: 'https://example.com/art.jpg',
  track_count: 10,
  duration: 3600000,
  permalink_url: 'https://soundcloud.com/test/sets/test',
  is_owned: true,
  is_public: true,
  secret_token: null,
};

describe('LibraryPlaylistItem', () => {
  it('renders playlist title and track count', () => {
    render(<LibraryPlaylistItem playlist={mockPlaylist} onOpenDetail={vi.fn()} onDownload={vi.fn()} />);
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('renders artwork image when artwork_url is provided', () => {
    render(<LibraryPlaylistItem playlist={mockPlaylist} onOpenDetail={vi.fn()} onDownload={vi.fn()} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/art.jpg');
  });

  it('renders placeholder when artwork_url is null', () => {
    const noArt = { ...mockPlaylist, artwork_url: null };
    render(<LibraryPlaylistItem playlist={noArt} onOpenDetail={vi.fn()} onDownload={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('library-item-artwork-placeholder')).toBeInTheDocument();
  });

  it('calls onOpenDetail when row is clicked', () => {
    const onOpenDetail = vi.fn();
    render(<LibraryPlaylistItem playlist={mockPlaylist} onOpenDetail={onOpenDetail} onDownload={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /test playlist/i }));
    expect(onOpenDetail).toHaveBeenCalled();
  });

  it('calls onDownload when download icon is clicked without opening detail', () => {
    const onOpenDetail = vi.fn();
    const onDownload = vi.fn();
    render(<LibraryPlaylistItem playlist={mockPlaylist} onOpenDetail={onOpenDetail} onDownload={onDownload} />);
    const downloadBtn = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadBtn);
    expect(onDownload).toHaveBeenCalled();
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it('shows username', () => {
    render(<LibraryPlaylistItem playlist={mockPlaylist} onOpenDetail={vi.fn()} onDownload={vi.fn()} />);
    expect(screen.getByText('TestUser')).toBeInTheDocument();
  });

  it('opens artist profile when username clicked, without opening detail', () => {
    mockOpenProfile.mockClear();
    const onOpenDetail = vi.fn();
    render(<LibraryPlaylistItem playlist={mockPlaylist} onOpenDetail={onOpenDetail} onDownload={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'TestUser' }));
    expect(mockOpenProfile).toHaveBeenCalledWith(99, 'TestUser');
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it('renders username as plain text when user_id is null', () => {
    const noUser = { ...mockPlaylist, user_id: null };
    render(<LibraryPlaylistItem playlist={noUser} onOpenDetail={vi.fn()} onDownload={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'TestUser' })).not.toBeInTheDocument();
    expect(screen.getByText('TestUser')).toBeInTheDocument();
  });
});
