import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaylistPreview } from './PlaylistPreview';
import type { PlaylistInfo } from '@/types/playlist';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      const translations: Record<string, string> = {
        'download.button': 'Download',
        'download.trackCount': `${options?.count ?? 0} tracks`,
      };
      return translations[key] || key;
    },
  }),
}));

const mockPlaylist: PlaylistInfo = {
  id: 123,
  title: 'Test Playlist',
  user: { username: 'testuser' },
  artwork_url: 'https://i1.sndcdn.com/artworks-xxx-large.jpg',
  track_count: 47,
  tracks: [],
};

const mockPlaylistNoArtwork: PlaylistInfo = {
  id: 456,
  title: 'No Art Playlist',
  user: { username: 'anotheruser' },
  artwork_url: null,
  track_count: 12,
  tracks: [
    {
      id: 1,
      title: 'Track 1',
      user: { username: 'anotheruser' },
      artwork_url: null,
      duration: 180000,
    },
  ],
};

const mockPlaylistWithTrackArtwork: PlaylistInfo = {
  id: 789,
  title: 'Playlist With Track Art',
  user: { username: 'someuser' },
  artwork_url: null,
  track_count: 3,
  tracks: [
    {
      id: 1,
      title: 'Track 1',
      user: { username: 'someuser' },
      artwork_url: 'https://i1.sndcdn.com/artworks-track1-large.jpg',
      duration: 180000,
    },
  ],
};

describe('PlaylistPreview', () => {
  describe('display', () => {
    it('should render playlist title (AC #2)', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      expect(screen.getByTestId('playlist-title')).toHaveTextContent('Test Playlist');
    });

    it('should render creator name (AC #2)', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      expect(screen.getByTestId('playlist-creator')).toHaveTextContent('testuser');
    });

    it('should render track count (AC #2)', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      expect(screen.getByTestId('playlist-track-count')).toHaveTextContent('47 tracks');
    });

  });

  describe('artwork', () => {
    it('should render playlist artwork when URL is provided (AC #2)', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      const artwork = screen.getByTestId('playlist-artwork') as HTMLImageElement;
      expect(artwork).toBeInTheDocument();
      expect(artwork.src).toContain('-t67x67');
    });

    it('should transform artwork URL to correct size (AC #2)', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      const artwork = screen.getByTestId('playlist-artwork') as HTMLImageElement;
      expect(artwork.src).toBe('https://i1.sndcdn.com/artworks-xxx-t67x67.jpg');
    });

    it('should render placeholder when artwork URL is null (AC #2)', () => {
      render(
        <PlaylistPreview playlist={mockPlaylistNoArtwork} onDownload={vi.fn()} />
      );

      expect(screen.getByTestId('playlist-artwork-placeholder')).toBeInTheDocument();
      expect(screen.queryByTestId('playlist-artwork')).not.toBeInTheDocument();
    });

    it('should fallback to first track artwork when playlist has no artwork', () => {
      render(
        <PlaylistPreview playlist={mockPlaylistWithTrackArtwork} onDownload={vi.fn()} />
      );

      const artwork = screen.getByTestId('playlist-artwork') as HTMLImageElement;
      expect(artwork).toBeInTheDocument();
      expect(artwork.src).toBe('https://i1.sndcdn.com/artworks-track1-t67x67.jpg');
    });
  });

  describe('download button', () => {
    it('should render download button with correct text (AC #3)', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      const button = screen.getByTestId('download-button');
      expect(button).toHaveTextContent('Download');
    });

    it('should call onDownload when button is clicked (AC #3)', () => {
      const onDownload = vi.fn();
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={onDownload} />
      );

      fireEvent.click(screen.getByTestId('download-button'));
      expect(onDownload).toHaveBeenCalledTimes(1);
    });

    it('should disable button when isDownloading is true', () => {
      render(
        <PlaylistPreview
          playlist={mockPlaylist}
          onDownload={vi.fn()}
          isDownloading={true}
        />
      );

      expect(screen.getByTestId('download-button')).toBeDisabled();
    });

    it('should not disable button when isDownloading is false', () => {
      render(
        <PlaylistPreview
          playlist={mockPlaylist}
          onDownload={vi.fn()}
          isDownloading={false}
        />
      );

      expect(screen.getByTestId('download-button')).not.toBeDisabled();
    });

    it('should not disable button by default', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      expect(screen.getByTestId('download-button')).not.toBeDisabled();
    });
  });

  describe('layout', () => {
    it('should render preview card', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      expect(screen.getByTestId('playlist-preview')).toBeInTheDocument();
    });

    it('should have proper CSS classes for truncation on title', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      expect(screen.getByTestId('playlist-title')).toHaveClass('truncate');
    });

    it('should have proper CSS classes for truncation on creator', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      expect(screen.getByTestId('playlist-creator')).toHaveClass('truncate');
    });
  });
});
