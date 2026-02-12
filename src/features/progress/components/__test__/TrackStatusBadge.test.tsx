import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TrackStatusBadge } from '../TrackStatusBadge';

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
        'errors.geoBlocked': 'Unavailable in your region',
      };
      return translations[key] || key;
    },
  }),
}));

describe('TrackStatusBadge', () => {
  describe('composition', () => {
    it('should render both icon and label for pending status', () => {
      render(<TrackStatusBadge status="pending" />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should render both icon and label for downloading status', () => {
      render(<TrackStatusBadge status="downloading" />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
      expect(screen.getByText('Downloading...')).toBeInTheDocument();
    });

    it('should render both icon and label for complete status', () => {
      render(<TrackStatusBadge status="complete" />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('should render error message when failed with error', () => {
      render(
        <TrackStatusBadge
          status="failed"
          error={{ code: 'GEO_BLOCKED', message: 'Not available' }}
        />
      );
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
      expect(screen.getByText('Unavailable in your region')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have role="status"', () => {
      render(<TrackStatusBadge status="pending" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-live="polite"', () => {
      render(<TrackStatusBadge status="pending" />);
      const statusContainer = screen.getByRole('status');
      expect(statusContainer).toHaveAttribute('aria-live', 'polite');
    });

    it('should have flex container with gap', () => {
      render(<TrackStatusBadge status="pending" />);
      const statusContainer = screen.getByRole('status');
      expect(statusContainer).toHaveClass('flex');
      expect(statusContainer).toHaveClass('items-center');
      expect(statusContainer).toHaveClass('gap-1.5');
    });
  });
});
