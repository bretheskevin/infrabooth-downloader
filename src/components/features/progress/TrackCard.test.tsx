import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TrackCard } from './TrackCard';
import type { Track } from '@/types/track';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'download.status.pending': 'Pending',
        'download.status.downloading': 'Downloading...',
        'download.status.converting': 'Converting...',
        'download.status.complete': 'Complete',
        'download.status.failed': 'Failed',
        'download.status.rateLimited': 'Rate limited',
        'download.startingDownload': 'Starting download...',
        'errors.geoBlocked': 'Unavailable in your region',
        'errors.geoBlockedDetail': 'Geographic restriction by rights holder',
        'errors.geoBlockedNoRetry': 'This track will not retry automatically',
        'errors.showDetails': 'Show details',
      };
      return translations[key] || key;
    },
  }),
}));

const mockTrack: Track = {
  id: 'track-1',
  title: 'Test Track Title',
  artist: 'Test Artist',
  artworkUrl: 'https://example.com/artwork.jpg',
  status: 'pending',
};

const mockTrackWithoutArtwork: Track = {
  ...mockTrack,
  id: 'track-2',
  artworkUrl: null,
};

const mockTrackWithLongTitle: Track = {
  ...mockTrack,
  id: 'track-3',
  title: 'This Is A Very Long Track Title That Should Be Truncated With Ellipsis',
  artist: 'Artist With A Very Long Name That Should Also Be Truncated',
};

const mockDownloadingTrack: Track = {
  ...mockTrack,
  id: 'track-4',
  status: 'downloading',
};

const mockConvertingTrack: Track = {
  ...mockTrack,
  id: 'track-5',
  status: 'converting',
};

const mockCompleteTrack: Track = {
  ...mockTrack,
  id: 'track-6',
  status: 'complete',
};

const mockFailedTrack: Track = {
  ...mockTrack,
  id: 'track-7',
  status: 'failed',
  error: { code: 'GEO_BLOCKED', message: 'Not available' },
};

describe('TrackCard', () => {
  describe('rendering', () => {
    it('should render track title', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      expect(screen.getByText('Test Track Title')).toBeInTheDocument();
    });

    it('should render artist name', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });

    it('should render avatar container when artworkUrl is provided', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      // Radix Avatar shows fallback until image loads - just verify the avatar wrapper exists
      const avatar = document.querySelector('span[class*="overflow-hidden"]');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('h-12', 'w-12', 'rounded-md');
    });

    it('should render fallback when artworkUrl is null', () => {
      render(<TrackCard track={mockTrackWithoutArtwork} isCurrentTrack={false} />);
      // Fallback should be visible (music note icon)
      const fallback = screen.getByTestId('artwork-fallback');
      expect(fallback).toBeInTheDocument();
    });
  });

  describe('current track highlight', () => {
    it('should apply primary highlight styles when isCurrentTrack is true and not active', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={true} />);
      const card = screen.getByRole('listitem');
      expect(card).toHaveClass('bg-primary/10');
      expect(card).toHaveClass('border-l-2');
      expect(card).toHaveClass('border-l-primary');
    });

    it('should not apply highlight styles when isCurrentTrack is false', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      const card = screen.getByRole('listitem');
      expect(card).not.toHaveClass('bg-primary/10');
    });
  });

  describe('active track highlight (downloading/converting)', () => {
    it('should apply indigo highlight when status is downloading', () => {
      render(<TrackCard track={mockDownloadingTrack} isCurrentTrack={false} />);
      const card = screen.getByRole('listitem');
      expect(card).toHaveClass('bg-indigo-50');
      expect(card).toHaveClass('border-indigo-200');
    });

    it('should apply indigo highlight when status is converting', () => {
      render(<TrackCard track={mockConvertingTrack} isCurrentTrack={false} />);
      const card = screen.getByRole('listitem');
      expect(card).toHaveClass('bg-indigo-50');
      expect(card).toHaveClass('border-indigo-200');
    });

    it('should not apply indigo highlight when status is complete', () => {
      render(<TrackCard track={mockCompleteTrack} isCurrentTrack={false} />);
      const card = screen.getByRole('listitem');
      expect(card).not.toHaveClass('bg-indigo-50');
    });

    it('should not apply indigo highlight when status is pending', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      const card = screen.getByRole('listitem');
      expect(card).not.toHaveClass('bg-indigo-50');
    });

    it('should prefer indigo highlight over primary highlight when active', () => {
      render(<TrackCard track={mockDownloadingTrack} isCurrentTrack={true} />);
      const card = screen.getByRole('listitem');
      expect(card).toHaveClass('bg-indigo-50');
      expect(card).not.toHaveClass('bg-primary/10');
    });
  });

  describe('status badge integration', () => {
    it('should render status badge for pending track', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should render status badge for downloading track', () => {
      render(<TrackCard track={mockDownloadingTrack} isCurrentTrack={false} />);
      expect(screen.getByText('Downloading...')).toBeInTheDocument();
    });

    it('should render status badge for complete track', () => {
      render(<TrackCard track={mockCompleteTrack} isCurrentTrack={false} />);
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('should render error message for failed track', () => {
      render(<TrackCard track={mockFailedTrack} isCurrentTrack={false} />);
      expect(screen.getByText('Unavailable in your region')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have role="listitem"', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    it('should have aria-current when current track', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={true} />);
      const card = screen.getByRole('listitem');
      expect(card).toHaveAttribute('aria-current', 'true');
    });

    it('should not have aria-current when not current track', () => {
      render(<TrackCard track={mockTrack} isCurrentTrack={false} />);
      const card = screen.getByRole('listitem');
      expect(card).not.toHaveAttribute('aria-current');
    });
  });

  describe('text truncation', () => {
    it('should have truncate class on title', () => {
      render(<TrackCard track={mockTrackWithLongTitle} isCurrentTrack={false} />);
      const title = screen.getByText(mockTrackWithLongTitle.title);
      expect(title).toHaveClass('truncate');
    });

    it('should have truncate class on artist', () => {
      render(<TrackCard track={mockTrackWithLongTitle} isCurrentTrack={false} />);
      const artist = screen.getByText(mockTrackWithLongTitle.artist);
      expect(artist).toHaveClass('truncate');
    });
  });

  describe('geo-blocked error handling', () => {
    it('should render geo-blocked error message', () => {
      render(<TrackCard track={mockFailedTrack} isCurrentTrack={false} />);
      expect(screen.getByText('Unavailable in your region')).toBeInTheDocument();
    });

    it('should not show details by default for non-geo-blocked errors', () => {
      const downloadFailedTrack: Track = {
        ...mockTrack,
        id: 'track-download-fail',
        status: 'failed',
        error: { code: 'DOWNLOAD_FAILED', message: 'Download failed' },
      };
      render(<TrackCard track={downloadFailedTrack} isCurrentTrack={false} />);
      // Should not have GeoBlockDetails trigger
      expect(screen.queryByText('Show details')).not.toBeInTheDocument();
    });

    it('should render failed track with correct accessibility', () => {
      render(<TrackCard track={mockFailedTrack} isCurrentTrack={false} />);
      const card = screen.getByRole('listitem');
      expect(card).toHaveAttribute(
        'aria-label',
        `${mockFailedTrack.title} by ${mockFailedTrack.artist}`
      );
    });
  });
});
