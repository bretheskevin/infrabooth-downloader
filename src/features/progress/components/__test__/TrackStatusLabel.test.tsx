import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TrackStatusLabel } from '../TrackStatusLabel';

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
        'download.rateLimitStatus': 'Waiting...',
        'errors.geoBlocked': 'Unavailable in your region',
        'errors.rateLimited': 'Rate limited - will retry',
        'errors.networkError': 'Network error',
        'errors.downloadFailed': 'Download failed',
        'errors.conversionFailed': 'Conversion failed',
        'errors.trackUnavailable': 'Track unavailable',
        'errors.trackUnavailableDetail': 'This track may have been removed or made private',
      };
      return translations[key] || key;
    },
  }),
}));

describe('TrackStatusLabel', () => {
  describe('rendering status text', () => {
    it('should render "Pending" for pending status', () => {
      render(<TrackStatusLabel status="pending" />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should render "Downloading..." for downloading status', () => {
      render(<TrackStatusLabel status="downloading" />);
      expect(screen.getByText('Downloading...')).toBeInTheDocument();
    });

    it('should render "Converting..." for converting status', () => {
      render(<TrackStatusLabel status="converting" />);
      expect(screen.getByText('Converting...')).toBeInTheDocument();
    });

    it('should render "Complete" for complete status', () => {
      render(<TrackStatusLabel status="complete" />);
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('should render "Failed" for failed status without error', () => {
      render(<TrackStatusLabel status="failed" />);
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('should render "Waiting..." for rate_limited status', () => {
      render(<TrackStatusLabel status="rate_limited" />);
      expect(screen.getByText('Waiting...')).toBeInTheDocument();
    });
  });

  describe('error messages', () => {
    it('should display error message when status is failed and error is provided', () => {
      render(
        <TrackStatusLabel
          status="failed"
          error={{ code: 'GEO_BLOCKED', message: 'Track unavailable' }}
        />
      );
      expect(screen.getByText('Unavailable in your region')).toBeInTheDocument();
    });

    it('should display network error message', () => {
      render(
        <TrackStatusLabel
          status="failed"
          error={{ code: 'NETWORK_ERROR', message: 'Connection lost' }}
        />
      );
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  describe('text color classes', () => {
    it('should apply muted color for pending status', () => {
      render(<TrackStatusLabel status="pending" />);
      const label = screen.getByText('Pending');
      expect(label).toHaveClass('text-muted-foreground');
    });

    it('should apply primary color for downloading status', () => {
      render(<TrackStatusLabel status="downloading" />);
      const label = screen.getByText('Downloading...');
      expect(label).toHaveClass('text-primary');
    });

    it('should apply primary color for converting status', () => {
      render(<TrackStatusLabel status="converting" />);
      const label = screen.getByText('Converting...');
      expect(label).toHaveClass('text-primary');
    });

    it('should apply success color for complete status', () => {
      render(<TrackStatusLabel status="complete" />);
      const label = screen.getByText('Complete');
      expect(label).toHaveClass('text-success');
    });

    it('should apply destructive color for failed status', () => {
      render(<TrackStatusLabel status="failed" />);
      const label = screen.getByText('Failed');
      expect(label).toHaveClass('text-destructive');
    });

    it('should apply warning color for rate_limited status', () => {
      render(<TrackStatusLabel status="rate_limited" />);
      const label = screen.getByText('Waiting...');
      expect(label).toHaveClass('text-warning');
    });

    it('should apply warning color for geo-blocked error', () => {
      render(
        <TrackStatusLabel
          status="failed"
          error={{ code: 'GEO_BLOCKED', message: 'Geo blocked' }}
        />
      );
      const label = screen.getByText('Unavailable in your region');
      expect(label).toHaveClass('text-warning');
    });

    it('should apply destructive color for download failed error', () => {
      render(
        <TrackStatusLabel
          status="failed"
          error={{ code: 'DOWNLOAD_FAILED', message: 'Download failed' }}
        />
      );
      const label = screen.getByText('Download failed');
      expect(label).toHaveClass('text-destructive');
    });

    it('should apply warning color for unavailable error', () => {
      render(
        <TrackStatusLabel
          status="failed"
          error={{ code: 'DOWNLOAD_FAILED', message: 'Track unavailable - may have been removed' }}
        />
      );
      const label = screen.getByText('Track unavailable');
      expect(label).toHaveClass('text-warning');
    });
  });

  describe('unavailable track errors', () => {
    it('should render "Track unavailable" for unavailable error', () => {
      render(
        <TrackStatusLabel
          status="failed"
          error={{ code: 'DOWNLOAD_FAILED', message: 'Track unavailable - may have been removed or made private' }}
        />
      );
      expect(screen.getByText('Track unavailable')).toBeInTheDocument();
    });

    it('should render "Track unavailable" for private video error', () => {
      render(
        <TrackStatusLabel
          status="failed"
          error={{ code: 'DOWNLOAD_FAILED', message: 'Private video. Sign in if you have access' }}
        />
      );
      expect(screen.getByText('Track unavailable')).toBeInTheDocument();
    });

    it('should render "Track unavailable" for removed track error', () => {
      render(
        <TrackStatusLabel
          status="failed"
          error={{ code: 'DOWNLOAD_FAILED', message: 'This track was removed by the uploader' }}
        />
      );
      expect(screen.getByText('Track unavailable')).toBeInTheDocument();
    });

    it('should render "Track unavailable" for 404 error', () => {
      render(
        <TrackStatusLabel
          status="failed"
          error={{ code: 'DOWNLOAD_FAILED', message: 'HTTP Error 404' }}
        />
      );
      expect(screen.getByText('Track unavailable')).toBeInTheDocument();
    });

    it('should use warning color for unavailable errors', () => {
      render(
        <TrackStatusLabel
          status="failed"
          error={{ code: 'DOWNLOAD_FAILED', message: 'Video unavailable' }}
        />
      );
      const label = screen.getByText('Track unavailable');
      expect(label).toHaveClass('text-warning');
    });
  });
});
