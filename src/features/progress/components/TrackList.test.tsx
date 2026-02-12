import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackList } from './TrackList';
import { useQueueStore } from '@/features/download/store';
import type { Track } from '@/features/download/types/track';

// Mock the i18n hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
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

describe('TrackList', () => {
  beforeEach(() => {
    // Reset store before each test
    useQueueStore.setState({
      tracks: [],
      currentIndex: 0,
      totalTracks: 0,
      isProcessing: false,
      isInitializing: false,
      isComplete: false,
      completedCount: 0,
      failedCount: 0,
    });
  });

  describe('empty state', () => {
    it('should render empty state message when no tracks', () => {
      render(<TrackList />);
      expect(screen.getByText('No tracks in queue')).toBeInTheDocument();
    });

    it('should not render scroll area when no tracks', () => {
      render(<TrackList />);
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('with tracks', () => {
    it('should render list of tracks', () => {
      const mockTracks = createMockTracks(3);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 3 });

      render(<TrackList />);

      expect(screen.getByText('Track 1')).toBeInTheDocument();
      expect(screen.getByText('Track 2')).toBeInTheDocument();
      expect(screen.getByText('Track 3')).toBeInTheDocument();
    });

    it('should render correct number of track cards', () => {
      const mockTracks = createMockTracks(5);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 5 });

      render(<TrackList />);

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(5);
    });

    it('should highlight current track', () => {
      const mockTracks = createMockTracks(3);
      useQueueStore.setState({
        tracks: mockTracks,
        totalTracks: 3,
        currentIndex: 1, // Second track is current
      });

      render(<TrackList />);

      const listItems = screen.getAllByRole('listitem');

      // First track should not be highlighted
      expect(listItems[0]).not.toHaveClass('bg-primary/10');

      // Second track (currentIndex = 1) should be highlighted
      expect(listItems[1]).toHaveClass('bg-primary/10');
      expect(listItems[1]).toHaveAttribute('aria-current', 'true');

      // Third track should not be highlighted
      expect(listItems[2]).not.toHaveClass('bg-primary/10');
    });
  });

  describe('accessibility', () => {
    it('should have role="list" on container', () => {
      const mockTracks = createMockTracks(2);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 2 });

      render(<TrackList />);

      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should have aria-label on scroll area', () => {
      const mockTracks = createMockTracks(2);
      useQueueStore.setState({ tracks: mockTracks, totalTracks: 2 });

      render(<TrackList />);

      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      expect(scrollArea?.closest('[aria-label]')).toHaveAttribute(
        'aria-label',
        'Download queue'
      );
    });
  });

  describe('single track', () => {
    it('should render single track correctly', () => {
      const mockTracks = createMockTracks(1);
      useQueueStore.setState({
        tracks: mockTracks,
        totalTracks: 1,
        currentIndex: 0,
      });

      render(<TrackList />);

      expect(screen.getByText('Track 1')).toBeInTheDocument();
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(1);
      expect(listItems[0]).toHaveClass('bg-primary/10');
    });
  });
});
