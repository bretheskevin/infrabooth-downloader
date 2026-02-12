import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OverallProgress } from './OverallProgress';
import { useQueueStore } from '@/features/download/store';
import type { Track } from '@/features/download/types/track';

// Mock the i18n hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'download.progress': `${params?.current} of ${params?.total} tracks`,
        'download.progressSingle': `${params?.current} of ${params?.total} track`,
        'download.progressAriaLabel': `Download progress: ${params?.current} of ${params?.total} tracks complete, ${params?.percentage}%`,
        'download.preparingTracks': 'Preparing your tracks for download',
      };
      return translations[key] || key;
    },
  }),
}));

const createMockTracks = (
  statuses: Array<'pending' | 'downloading' | 'converting' | 'complete' | 'failed'>
): Track[] =>
  statuses.map((status, i) => ({
    id: `track-${i + 1}`,
    title: `Track ${i + 1}`,
    artist: `Artist ${i + 1}`,
    artworkUrl: null,
    status,
  }));

describe('OverallProgress', () => {
  beforeEach(() => {
    // Reset store before each test
    useQueueStore.setState({
      tracks: [],
      currentIndex: 0,
      totalTracks: 0,
      isProcessing: false,
      isComplete: false,
      completedCount: 0,
      failedCount: 0,
    });
  });

  describe('rendering', () => {
    it('should not render when no tracks in queue', () => {
      const { container } = render(<OverallProgress />);
      expect(container.firstChild).toBeNull();
    });

    it('should render progress bar when tracks exist', () => {
      const mockTracks = createMockTracks(['pending', 'pending', 'pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      render(<OverallProgress />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render counter text with correct format', () => {
      const mockTracks = createMockTracks(['complete', 'complete', 'downloading']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      render(<OverallProgress />);

      expect(screen.getByText('2 of 3 tracks')).toBeInTheDocument();
    });

    it('should show preparing message with spinner when all tracks are pending', () => {
      const mockTracks = createMockTracks(['pending', 'pending', 'pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      render(<OverallProgress />);

      expect(screen.getByText('Preparing your tracks for download')).toBeInTheDocument();
      // Spinner should be present (Loader2 renders as svg)
      const spinner = document.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should hide preparing message once a track starts downloading', () => {
      const mockTracks = createMockTracks(['downloading', 'pending', 'pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      render(<OverallProgress />);

      expect(screen.queryByText('Preparing your tracks for download')).not.toBeInTheDocument();
      expect(screen.getByText('0 of 3 tracks')).toBeInTheDocument();
    });

    it('should show preparing message between tracks when one is complete and next is pending', () => {
      const mockTracks = createMockTracks(['complete', 'pending', 'pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      render(<OverallProgress />);

      expect(screen.getByText('Preparing your tracks for download')).toBeInTheDocument();
      const spinner = document.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should hide preparing message when a track is converting', () => {
      const mockTracks = createMockTracks(['converting', 'pending', 'pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      render(<OverallProgress />);

      expect(screen.queryByText('Preparing your tracks for download')).not.toBeInTheDocument();
      expect(screen.getByText('0 of 3 tracks')).toBeInTheDocument();
    });
  });

  describe('progress calculation', () => {
    it('should show 0% when no tracks complete', () => {
      const mockTracks = createMockTracks(['pending', 'pending', 'pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      render(<OverallProgress />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should calculate correct percentage for partial completion', () => {
      const mockTracks = createMockTracks(['complete', 'complete', 'pending', 'pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 4 });

      render(<OverallProgress />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should show 100% when all tracks complete', () => {
      const mockTracks = createMockTracks(['complete', 'complete', 'complete']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      render(<OverallProgress />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should NOT count failed tracks as completed', () => {
      const mockTracks = createMockTracks(['complete', 'complete', 'failed', 'downloading']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 4 });

      render(<OverallProgress />);

      // 2 complete out of 4 = 50%
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(screen.getByText('2 of 4 tracks')).toBeInTheDocument();
    });

    it('should NOT count downloading/converting tracks as completed', () => {
      const mockTracks = createMockTracks(['complete', 'downloading', 'converting', 'pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 4 });

      render(<OverallProgress />);

      // Only 1 complete out of 4 = 25%
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    });
  });

  describe('accessibility', () => {
    it('should have role="progressbar" on progress element', () => {
      const mockTracks = createMockTracks(['pending', 'pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 2 });

      render(<OverallProgress />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should have aria-valuemin and aria-valuemax', () => {
      const mockTracks = createMockTracks(['pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 1 });

      render(<OverallProgress />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have aria-label describing progress', () => {
      const mockTracks = createMockTracks(['complete', 'pending', 'pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      render(<OverallProgress />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute(
        'aria-label',
        expect.stringContaining('1 of 3')
      );
    });

    it('should have aria-live="polite" on counter text', () => {
      // Use tracks with at least one active to show progress text
      const mockTracks = createMockTracks(['complete', 'downloading']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 2 });

      render(<OverallProgress />);

      const liveRegion = screen.getByText('1 of 2 tracks');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('edge cases', () => {
    it('should handle single track correctly', () => {
      // Use a downloading track to test singular form (pending shows preparing message)
      const mockTracks = createMockTracks(['downloading']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 1 });

      render(<OverallProgress />);

      // Should use singular "track" form
      expect(screen.getByText('0 of 1 track')).toBeInTheDocument();
    });

    it('should show preparing message when single track is pending', () => {
      const mockTracks = createMockTracks(['pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 1 });

      render(<OverallProgress />);

      expect(screen.getByText('Preparing your tracks for download')).toBeInTheDocument();
    });

    it('should handle all failed tracks', () => {
      const mockTracks = createMockTracks(['failed', 'failed', 'failed']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      render(<OverallProgress />);

      expect(screen.getByText('0 of 3 tracks')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('styling', () => {
    it('should accept className prop', () => {
      const mockTracks = createMockTracks(['pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 1 });

      render(<OverallProgress className="custom-class" />);

      const container = screen.getByRole('progressbar').parentElement;
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('performance', () => {
    it('should update when track status changes from pending to downloading to complete', () => {
      const mockTracks = createMockTracks(['pending', 'pending', 'pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      const { rerender } = render(<OverallProgress />);

      // Initial state - all pending, shows preparing message
      expect(screen.getByText('Preparing your tracks for download')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

      // Update first track to downloading - should hide preparing
      const downloadingTracks: Track[] = mockTracks.map((track, idx) =>
        idx === 0 ? { ...track, status: 'downloading' as const } : track
      );
      useQueueStore.setState({ tracks: downloadingTracks });
      rerender(<OverallProgress />);

      expect(screen.queryByText('Preparing your tracks for download')).not.toBeInTheDocument();
      expect(screen.getByText('0 of 3 tracks')).toBeInTheDocument();

      // Update first track to complete, second to downloading
      const progressTracks: Track[] = mockTracks.map((track, idx) => {
        if (idx === 0) return { ...track, status: 'complete' as const };
        if (idx === 1) return { ...track, status: 'downloading' as const };
        return track;
      });
      useQueueStore.setState({ tracks: progressTracks });
      rerender(<OverallProgress />);

      // Should now show 1 complete
      expect(screen.getByText('1 of 3 tracks')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
    });

    it('should handle rapid state changes correctly', () => {
      const mockTracks = createMockTracks(['pending', 'pending', 'pending', 'pending', 'pending']);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 5 });

      const { rerender } = render(<OverallProgress />);

      // Simulate rapid status updates - always keep one track downloading until all complete
      for (let i = 0; i < 5; i++) {
        const updatedTracks = mockTracks.map((track, idx) => ({
          ...track,
          status: idx < i ? 'complete' as const : idx === i ? 'downloading' as const : 'pending' as const,
        }));
        useQueueStore.setState({ tracks: updatedTracks });
        rerender(<OverallProgress />);
      }

      // Final update: all complete
      const finalTracks = mockTracks.map((track) => ({
        ...track,
        status: 'complete' as const,
      }));
      useQueueStore.setState({ tracks: finalTracks });
      rerender(<OverallProgress />);

      // Final state should show all complete
      expect(screen.getByText('5 of 5 tracks')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('should only count complete status, not intermediate states', () => {
      const mockTracks: Track[] = [
        { id: '1', title: 'T1', artist: 'A1', artworkUrl: null, status: 'complete' },
        { id: '2', title: 'T2', artist: 'A2', artworkUrl: null, status: 'downloading' },
        { id: '3', title: 'T3', artist: 'A3', artworkUrl: null, status: 'converting' },
        { id: '4', title: 'T4', artist: 'A4', artworkUrl: null, status: 'pending' },
        { id: '5', title: 'T5', artist: 'A5', artworkUrl: null, status: 'failed' },
      ];
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 5 });

      render(<OverallProgress />);

      // Only 1 track is 'complete'
      expect(screen.getByText('1 of 5 tracks')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');
    });
  });
});
