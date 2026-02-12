import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressPanel } from '../ProgressPanel';
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
        'progress.trackList.emptyState': 'No tracks in queue',
        'progress.trackList.ariaLabel': 'Download queue',
      };
      return translations[key] || key;
    },
  }),
}));

const createMockTracks = (count: number): Track[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `track-${i + 1}`,
    title: `Track ${i + 1}`,
    artist: `Artist ${i + 1}`,
    artworkUrl: null,
    status: 'pending' as const,
  }));

describe('ProgressPanel', () => {
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

  describe('empty state', () => {
    it('should render empty state when no tracks', () => {
      render(<ProgressPanel />);
      expect(screen.getByText('No tracks in queue')).toBeInTheDocument();
    });

    it('should not render progress bar when no tracks', () => {
      render(<ProgressPanel />);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('with tracks', () => {
    it('should render both OverallProgress and TrackList', () => {
      const mockTracks = createMockTracks(3);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      render(<ProgressPanel />);

      // Progress bar should be visible
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      // Track list should be visible
      expect(screen.getByText('Track 1')).toBeInTheDocument();
      expect(screen.getByText('Track 2')).toBeInTheDocument();
      expect(screen.getByText('Track 3')).toBeInTheDocument();
    });

    it('should position OverallProgress above TrackList', () => {
      const mockTracks = createMockTracks(2);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 2 });

      render(<ProgressPanel />);

      // Get the progress bar
      const progressBar = screen.getByRole('progressbar');

      // Check DOM order - progress bar should come before track list
      const container = progressBar.closest('[data-testid="progress-panel"]');
      expect(container).toBeInTheDocument();

      const children = container?.children;
      expect(children).toBeDefined();
      expect(children?.length).toBeGreaterThanOrEqual(2);

      // First child should contain progress bar, second should contain track list
      const progressSection = children?.[0];
      const trackSection = children?.[1];
      expect(progressSection?.querySelector('[role="progressbar"]')).toBeTruthy();
      expect(trackSection?.querySelector('[role="list"]')).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('should accept className prop', () => {
      const mockTracks = createMockTracks(1);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 1 });

      render(<ProgressPanel className="custom-panel-class" />);

      const panel = screen.getByTestId('progress-panel');
      expect(panel).toHaveClass('custom-panel-class');
    });
  });
});
