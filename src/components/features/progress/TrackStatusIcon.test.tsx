import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrackStatusIcon } from './TrackStatusIcon';

describe('TrackStatusIcon', () => {
  describe('rendering status icons', () => {
    it('should render clock icon for pending status', () => {
      render(<TrackStatusIcon status="pending" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-gray-400');
    });

    it('should render spinner icon for downloading status', () => {
      render(<TrackStatusIcon status="downloading" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-indigo-500');
      expect(icon).toHaveClass('animate-spin');
    });

    it('should render spinner icon for converting status', () => {
      render(<TrackStatusIcon status="converting" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-indigo-500');
      expect(icon).toHaveClass('animate-spin');
    });

    it('should render checkmark icon for complete status', () => {
      render(<TrackStatusIcon status="complete" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-emerald-500');
    });

    it('should render warning icon for failed status with warning error', () => {
      render(
        <TrackStatusIcon
          status="failed"
          errorCode="GEO_BLOCKED"
        />
      );
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-amber-500');
    });

    it('should render error icon for failed status with error code', () => {
      render(
        <TrackStatusIcon
          status="failed"
          errorCode="DOWNLOAD_FAILED"
        />
      );
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-rose-500');
    });

    it('should render clock icon (not spinner) for rate_limited status', () => {
      render(<TrackStatusIcon status="rate_limited" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-amber-500');
      expect(icon).not.toHaveClass('animate-spin');
    });
  });

  describe('accessibility', () => {
    it('should have aria-label for pending status', () => {
      render(<TrackStatusIcon status="pending" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveAttribute('aria-label', 'Pending');
    });

    it('should have aria-label for downloading status', () => {
      render(<TrackStatusIcon status="downloading" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveAttribute('aria-label', 'Downloading');
    });

    it('should have aria-label for converting status', () => {
      render(<TrackStatusIcon status="converting" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveAttribute('aria-label', 'Converting');
    });

    it('should have aria-label for complete status', () => {
      render(<TrackStatusIcon status="complete" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveAttribute('aria-label', 'Complete');
    });

    it('should have aria-label for failed status', () => {
      render(<TrackStatusIcon status="failed" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveAttribute('aria-label', 'Failed');
    });

    it('should have aria-label for rate_limited status', () => {
      render(<TrackStatusIcon status="rate_limited" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveAttribute('aria-label', 'Rate limited');
    });

    it('should have specific aria-label for geo-blocked errors', () => {
      render(<TrackStatusIcon status="failed" errorCode="GEO_BLOCKED" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveAttribute('aria-label', 'Geographic restriction warning');
    });

    it('should use generic aria-label for rate-limited warning errors', () => {
      render(<TrackStatusIcon status="failed" errorCode="RATE_LIMITED" />);
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveAttribute('aria-label', 'Failed');
    });
  });
});
