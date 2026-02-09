import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackPreview } from './TrackPreview';
import type { TrackInfo } from '@/types/playlist';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'download.singleTrack': '1 track',
        'download.button': 'Download',
      };
      return translations[key] || key;
    },
  }),
}));

describe('TrackPreview', () => {
  const mockTrack: TrackInfo = {
    id: 123456,
    title: 'Test Track Title',
    user: { username: 'Test Artist' },
    artwork_url: 'https://example.com/artwork.jpg',
    duration: 185000, // 3:05
  };

  const mockOnDownload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('display', () => {
    it('should render track title (AC #2)', () => {
      render(<TrackPreview track={mockTrack} onDownload={mockOnDownload} />);

      expect(screen.getByTestId('track-title')).toHaveTextContent(
        'Test Track Title'
      );
    });

    it('should render artist name (AC #2)', () => {
      render(<TrackPreview track={mockTrack} onDownload={mockOnDownload} />);

      expect(screen.getByTestId('track-artist')).toHaveTextContent('Test Artist');
    });

    it('should render formatted duration (AC #2)', () => {
      render(<TrackPreview track={mockTrack} onDownload={mockOnDownload} />);

      expect(screen.getByTestId('track-duration')).toHaveTextContent('3:05');
    });

    it('should render "1 track" indicator (AC #2)', () => {
      render(<TrackPreview track={mockTrack} onDownload={mockOnDownload} />);

      expect(screen.getByTestId('track-count')).toHaveTextContent('1 track');
    });

    it('should render quality badge (AC #3)', () => {
      render(<TrackPreview track={mockTrack} onDownload={mockOnDownload} />);

      expect(screen.getByTestId('quality-badge')).toHaveTextContent(
        '256kbps AAC → MP3'
      );
    });
  });

  describe('artwork', () => {
    it('should render track artwork when URL is provided (AC #2)', () => {
      render(<TrackPreview track={mockTrack} onDownload={mockOnDownload} />);

      const artwork = screen.getByTestId('track-artwork') as HTMLImageElement;
      expect(artwork).toBeInTheDocument();
      expect(artwork.src).toBe('https://example.com/artwork.jpg');
    });

    it('should render placeholder when artwork_url is null (AC #2)', () => {
      const trackWithoutArt = { ...mockTrack, artwork_url: null };
      render(<TrackPreview track={trackWithoutArt} onDownload={mockOnDownload} />);

      expect(screen.getByTestId('track-artwork-placeholder')).toBeInTheDocument();
      expect(screen.queryByTestId('track-artwork')).not.toBeInTheDocument();
    });
  });

  describe('download button', () => {
    it('should render download button with correct text (AC #3)', () => {
      render(<TrackPreview track={mockTrack} onDownload={mockOnDownload} />);

      const button = screen.getByTestId('download-button');
      expect(button).toHaveTextContent('Download');
    });

    it('should call onDownload when button is clicked (AC #3)', () => {
      render(<TrackPreview track={mockTrack} onDownload={mockOnDownload} />);

      fireEvent.click(screen.getByTestId('download-button'));
      expect(mockOnDownload).toHaveBeenCalledTimes(1);
    });

    it('should disable button when isDownloading is true', () => {
      render(
        <TrackPreview
          track={mockTrack}
          onDownload={mockOnDownload}
          isDownloading={true}
        />
      );

      expect(screen.getByTestId('download-button')).toBeDisabled();
    });

    it('should not disable button when isDownloading is false', () => {
      render(
        <TrackPreview
          track={mockTrack}
          onDownload={mockOnDownload}
          isDownloading={false}
        />
      );

      expect(screen.getByTestId('download-button')).not.toBeDisabled();
    });

    it('should not disable button by default', () => {
      render(<TrackPreview track={mockTrack} onDownload={mockOnDownload} />);

      expect(screen.getByTestId('download-button')).not.toBeDisabled();
    });
  });

  describe('layout', () => {
    it('should render preview card', () => {
      render(<TrackPreview track={mockTrack} onDownload={mockOnDownload} />);

      expect(screen.getByTestId('track-preview')).toBeInTheDocument();
    });

    it('should have proper CSS classes for truncation on title', () => {
      render(<TrackPreview track={mockTrack} onDownload={mockOnDownload} />);

      expect(screen.getByTestId('track-title')).toHaveClass('truncate');
    });

    it('should have proper CSS classes for truncation on artist', () => {
      render(<TrackPreview track={mockTrack} onDownload={mockOnDownload} />);

      expect(screen.getByTestId('track-artist')).toHaveClass('truncate');
    });
  });

  describe('edge cases', () => {
    it('should handle zero duration', () => {
      const zeroDurationTrack = { ...mockTrack, duration: 0 };
      render(<TrackPreview track={zeroDurationTrack} onDownload={mockOnDownload} />);

      expect(screen.getByTestId('track-duration')).toHaveTextContent('0:00');
    });

    it('should handle long duration (over an hour)', () => {
      const longTrack = { ...mockTrack, duration: 3661000 }; // 61:01
      render(<TrackPreview track={longTrack} onDownload={mockOnDownload} />);

      expect(screen.getByTestId('track-duration')).toHaveTextContent('61:01');
    });
  });
});
