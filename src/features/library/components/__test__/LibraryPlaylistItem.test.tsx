import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryPlaylistItem } from '../LibraryPlaylistItem';
import type { LibraryPlaylist } from '../../types';

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

const mockPlaylist: LibraryPlaylist = {
  id: 1,
  title: 'Test Playlist',
  username: 'TestUser',
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
    render(<LibraryPlaylistItem playlist={mockPlaylist} onSelect={vi.fn()} />);
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('renders artwork image when artwork_url is provided', () => {
    render(<LibraryPlaylistItem playlist={mockPlaylist} onSelect={vi.fn()} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/art.jpg');
  });

  it('renders placeholder when artwork_url is null', () => {
    const noArt = { ...mockPlaylist, artwork_url: null };
    render(<LibraryPlaylistItem playlist={noArt} onSelect={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('library-item-artwork-placeholder')).toBeInTheDocument();
  });

  it('calls onSelect with permalink_url when clicked', () => {
    const onSelect = vi.fn();
    render(<LibraryPlaylistItem playlist={mockPlaylist} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('https://soundcloud.com/test/sets/test');
  });

  it('shows username', () => {
    render(<LibraryPlaylistItem playlist={mockPlaylist} onSelect={vi.fn()} />);
    expect(screen.getByText('TestUser')).toBeInTheDocument();
  });
});
