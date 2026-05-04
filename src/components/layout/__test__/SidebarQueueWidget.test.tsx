import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarQueueWidget } from '../SidebarQueueWidget';
import { useQueueStore } from '@/features/queue/store';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'sidebar.downloading': 'Downloading...',
        'sidebar.noActiveDownload': 'No active download',
        'sidebar.queueProgress': `${params?.completed}/${params?.total}`,
      };
      return translations[key] || key;
    },
  }),
}));

describe('SidebarQueueWidget', () => {
  beforeEach(() => {
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

  it('should show idle message when not processing', () => {
    render(<SidebarQueueWidget />);
    expect(screen.getByText('No active download')).toBeInTheDocument();
  });

  it('should show current track name when downloading', () => {
    useQueueStore.setState({
      tracks: [
        {
          id: '1',
          title: 'Cool Track',
          artist: 'DJ Test',
          artworkUrl: null,
          durationMs: 300000,
          status: 'downloading',
        },
      ],
      currentIndex: 0,
      totalTracks: 1,
      isProcessing: true,
      completedCount: 0,
    });

    render(<SidebarQueueWidget />);
    expect(screen.getByText('Cool Track')).toBeInTheDocument();
    expect(screen.getByText('Downloading...')).toBeInTheDocument();
  });

  it('should show progress counter', () => {
    useQueueStore.setState({
      tracks: [
        {
          id: '1',
          title: 'Track 1',
          artist: 'Artist',
          artworkUrl: null,
          durationMs: 300000,
          status: 'complete',
        },
        {
          id: '2',
          title: 'Track 2',
          artist: 'Artist',
          artworkUrl: null,
          durationMs: 300000,
          status: 'downloading',
        },
      ],
      currentIndex: 1,
      totalTracks: 2,
      isProcessing: true,
      completedCount: 1,
    });

    render(<SidebarQueueWidget />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('should render a progress bar when downloading', () => {
    useQueueStore.setState({
      tracks: [
        {
          id: '1',
          title: 'Track 1',
          artist: 'Artist',
          artworkUrl: null,
          durationMs: 300000,
          status: 'downloading',
          percent: 50,
        },
      ],
      currentIndex: 0,
      totalTracks: 1,
      isProcessing: true,
      completedCount: 0,
    });

    render(<SidebarQueueWidget />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
