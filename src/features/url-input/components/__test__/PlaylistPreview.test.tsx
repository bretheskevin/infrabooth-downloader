import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlaylistPreview } from '../PlaylistPreview';
import type { PlaylistInfo } from '@/features/url-input/types/playlist';

// Mock bindings
const mockScanExistingTracks = vi.fn().mockResolvedValue([]);
vi.mock('@/bindings', () => ({
  commands: {
    scanExistingTracks: (...args: unknown[]) => mockScanExistingTracks(...args),
  },
}));

// Mock settings store
const mockSetPreservePlaylistOrder = vi.fn();
vi.mock('@/features/settings/store', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      downloadPath: '/test/downloads',
      preservePlaylistOrder: true,
      setPreservePlaylistOrder: mockSetPreservePlaylistOrder,
    };
    return selector(state);
  }),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      const translations: Record<string, string> = {
        'download.button': 'Download',
        'download.trackCount': `${options?.count ?? 0} tracks`,
        'download.preserveOrder': 'Number tracks',
        'download.preserveOrderDescription': 'Prefix filenames with track position (e.g. 01 - Artist - Title)',
        'download.alreadyDownloaded': `${options?.count ?? 0} already downloaded`,
      };
      return translations[key] || key;
    },
  }),
}));

// Mock DownloadBar to test PlaylistPreview in isolation
vi.mock('../DownloadBar', () => ({
  DownloadBar: ({ onDownload, isDownloading }: { onDownload: () => void; isDownloading?: boolean }) => (
    <button
      data-testid="download-button"
      onClick={onDownload}
      disabled={isDownloading}
    >
      Download
    </button>
  ),
}));

const mockPlaylist: PlaylistInfo = {
  id: 123,
  title: 'Test Playlist',
  user: { username: 'testuser', avatar_url: null },
  artwork_url: 'https://i1.sndcdn.com/artworks-xxx-large.jpg',
  track_count: 47,
  tracks: [
    { id: 1, title: 'Track 1', user: { username: 'testuser', avatar_url: null }, artwork_url: null, duration: 180000, permalink_url: '', waveform_url: null, downloadable: false, download_url: null },
    { id: 2, title: 'Track 2', user: { username: 'testuser', avatar_url: null }, artwork_url: null, duration: 200000, permalink_url: '', waveform_url: null, downloadable: false, download_url: null },
  ],
};

const mockSingleTrackPlaylist: PlaylistInfo = {
  id: 999,
  title: 'Single Track',
  user: { username: 'testuser', avatar_url: null },
  artwork_url: 'https://i1.sndcdn.com/artworks-xxx-large.jpg',
  track_count: 1,
  tracks: [
    { id: 1, title: 'Track 1', user: { username: 'testuser', avatar_url: null }, artwork_url: null, duration: 180000, permalink_url: '', waveform_url: null, downloadable: false, download_url: null },
  ],
};

const mockPlaylistNoArtwork: PlaylistInfo = {
  id: 456,
  title: 'No Art Playlist',
  user: { username: 'anotheruser', avatar_url: null },
  artwork_url: null,
  track_count: 12,
  tracks: [
    {
      id: 1,
      title: 'Track 1',
      user: { username: 'anotheruser', avatar_url: null },
      artwork_url: null,
      duration: 180000,
      permalink_url: '',
      waveform_url: null, downloadable: false, download_url: null,
    },
  ],
};

const mockPlaylistWithTrackArtwork: PlaylistInfo = {
  id: 789,
  title: 'Playlist With Track Art',
  user: { username: 'someuser', avatar_url: null },
  artwork_url: null,
  track_count: 3,
  tracks: [
    {
      id: 1,
      title: 'Track 1',
      user: { username: 'someuser', avatar_url: null },
      artwork_url: 'https://i1.sndcdn.com/artworks-track1-large.jpg',
      duration: 180000,
      permalink_url: '',
      waveform_url: null, downloadable: false, download_url: null,
    },
  ],
};

describe('PlaylistPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('preserve order toggle', () => {
    it('should render the preserve order switch', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      expect(screen.getByTestId('preserve-order-switch')).toBeInTheDocument();
    });

    it('should render the label text', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      expect(screen.getByText('Number tracks')).toBeInTheDocument();
    });

    it('should be checked when preservePlaylistOrder is true', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      const switchEl = screen.getByTestId('preserve-order-switch');
      expect(switchEl).toHaveAttribute('data-state', 'checked');
    });

    it('should call setPreservePlaylistOrder when toggled', () => {
      render(
        <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
      );

      fireEvent.click(screen.getByTestId('preserve-order-switch'));
      expect(mockSetPreservePlaylistOrder).toHaveBeenCalledWith(false);
    });

    it('should not render the toggle for single-track playlists', () => {
      render(
        <PlaylistPreview playlist={mockSingleTrackPlaylist} onDownload={vi.fn()} />
      );

      expect(screen.queryByTestId('preserve-order-switch')).not.toBeInTheDocument();
    });
  });

  describe('already downloaded badge', () => {
    it('should show already downloaded badge when tracks exist', async () => {
      mockScanExistingTracks.mockResolvedValue(['1', '2']);

      render(<PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId('already-downloaded-count')).toHaveTextContent(
          '2 already downloaded'
        );
      });
    });

    it('should not show badge when no tracks exist', async () => {
      mockScanExistingTracks.mockResolvedValue([]);

      render(<PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />);

      await waitFor(() => {
        expect(screen.queryByTestId('already-downloaded-count')).not.toBeInTheDocument();
      });
    });

    it('should not show badge when scan fails', async () => {
      mockScanExistingTracks.mockRejectedValue(new Error('scan failed'));

      render(<PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />);

      await waitFor(() => {
        expect(screen.queryByTestId('already-downloaded-count')).not.toBeInTheDocument();
      });
    });
  });
});
