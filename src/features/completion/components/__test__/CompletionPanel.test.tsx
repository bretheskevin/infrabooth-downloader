import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompletionPanel } from '../CompletionPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'completion.title': 'Download complete!',
        'completion.titlePartial': 'Download finished',
        'completion.titleCancelled': 'Download cancelled',
        'completion.allTracksDownloaded': `All ${options?.total} tracks downloaded`,
        'completion.tracksDownloaded': `${options?.completed} of ${options?.total} tracks downloaded`,
        'completion.tracksCancelled': `${options?.completed} tracks downloaded before cancellation`,
        'completion.allCancelled': 'No tracks were downloaded',
        'completion.openFolder': 'Open Folder',
        'completion.downloadAnother': 'Download Another',
        'completion.retryFailed': `Retry Failed (${options?.count})`,
        'completion.retryAll': 'Retry All',
        'completion.tracksNeedAttention':
          options?.count === 1
            ? '1 track needs attention'
            : `${options?.count} tracks need attention`,
        'completion.viewFailed': 'View details',
        'errors.panelTitle': 'Failed Downloads',
        'errors.closePanel': 'Close error panel',
        'errors.groupGeoBlocked': 'Unavailable in your region',
        'errors.groupUnavailable': 'Track removed or private',
        'errors.groupNetwork': 'Network errors',
        'errors.groupOther': 'Other errors',
        'errors.retryTrack': 'Retry this track',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/lib/shellCommands', () => ({
  openDownloadFolder: vi.fn(),
}));

vi.mock('@/features/settings/api/settings', () => ({
  getDefaultDownloadPath: vi.fn().mockResolvedValue('/Users/default/Downloads'),
}));

const mockQueueState = {
  outputDir: '/Users/test/Downloads',
  isRetrying: false,
  failedCount: 0,
  isProcessing: false,
};

vi.mock('@/features/queue/store', () => ({
  useQueueStore: vi.fn((selector: (state: typeof mockQueueState) => unknown) =>
    selector(mockQueueState)
  ),
}));

vi.mock('@/features/queue/hooks/useFailedTracks', () => ({
  useFailedTracks: vi.fn(() => []),
}));

vi.mock('@/features/queue/hooks/useRetryTracks', () => ({
  useRetryTracks: vi.fn(() => ({
    isRetrying: false,
    retryAllFailed: vi.fn(),
    retrySingleTrack: vi.fn(),
    canRetry: true,
  })),
}));

import { openDownloadFolder } from '@/lib/shellCommands';
import { useFailedTracks } from '@/features/queue/hooks/useFailedTracks';
import { useRetryTracks } from '@/features/queue/hooks/useRetryTracks';

describe('CompletionPanel', () => {
  const defaultProps = {
    completedCount: 10,
    totalCount: 10,
    failedCount: 0,
    cancelledCount: 0,
    isCancelled: false,
    onDownloadAnother: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFailedTracks).mockReturnValue([]);
    vi.mocked(useRetryTracks).mockReturnValue({
      isRetrying: false,
      retryAllFailed: vi.fn(),
      retrySingleTrack: vi.fn(),
      canRetry: true,
    });
  });

  it('should render full success state correctly', () => {
    render(<CompletionPanel {...defaultProps} />);

    expect(screen.getByText('Download complete!')).toBeInTheDocument();
    expect(screen.getByText('All 10 tracks downloaded')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open folder/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /download another/i })
    ).toBeInTheDocument();
  });

  it('should render partial success state with error panel trigger', () => {
    vi.mocked(useFailedTracks).mockReturnValue([
      {
        id: '1',
        title: 'Track 1',
        artist: 'Artist 1',
        error: { code: 'GEO_BLOCKED', message: 'Not available' },
      },
      {
        id: '2',
        title: 'Track 2',
        artist: 'Artist 2',
        error: { code: 'NETWORK_ERROR', message: 'Network failed' },
      },
    ]);

    render(
      <CompletionPanel {...defaultProps} completedCount={8} failedCount={2} />
    );

    expect(screen.getByText('Download finished')).toBeInTheDocument();
    expect(screen.getByText('8 of 10 tracks downloaded')).toBeInTheDocument();
    expect(screen.getByText('2 tracks need attention')).toBeInTheDocument();
  });

  it('should not show error panel trigger when all succeed', () => {
    render(<CompletionPanel {...defaultProps} />);

    expect(screen.queryByText(/tracks need attention/)).not.toBeInTheDocument();
  });

  it('should call openDownloadFolder when Open Folder is clicked', async () => {
    const mockOpen = vi.mocked(openDownloadFolder);
    render(<CompletionPanel {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /open folder/i }));

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith('/Users/test/Downloads');
    });
  });

  it('should call onDownloadAnother when Download Another is clicked', () => {
    const onDownloadAnother = vi.fn();
    render(
      <CompletionPanel {...defaultProps} onDownloadAnother={onDownloadAnother} />
    );

    fireEvent.click(screen.getByRole('button', { name: /download another/i }));

    expect(onDownloadAnother).toHaveBeenCalledTimes(1);
  });

  it('should expand error panel when view details is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useFailedTracks).mockReturnValue([
      {
        id: '1',
        title: 'Failed Track',
        artist: 'Artist',
        error: { code: 'GEO_BLOCKED', message: 'Not available' },
      },
    ]);

    render(
      <CompletionPanel {...defaultProps} completedCount={9} failedCount={1} />
    );

    const viewDetailsButton = screen.getByRole('button', {
      name: /view details/i,
    });
    await user.click(viewDetailsButton);

    expect(screen.getByText('Failed Downloads')).toBeInTheDocument();
    expect(screen.getByText('Failed Track')).toBeInTheDocument();
  });

  it('should have role="status" for accessibility', () => {
    render(<CompletionPanel {...defaultProps} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should have aria-live="polite" for screen reader announcements', () => {
    render(<CompletionPanel {...defaultProps} />);

    const panel = screen.getByRole('status');
    expect(panel).toHaveAttribute('aria-live', 'polite');
  });

  it('should have fade-in animation class', () => {
    render(<CompletionPanel {...defaultProps} />);

    const panel = screen.getByRole('status');
    expect(panel).toHaveClass('animate-in');
    expect(panel).toHaveClass('fade-in');
  });

  it('should render cancelled state correctly', () => {
    render(
      <CompletionPanel
        {...defaultProps}
        completedCount={3}
        cancelledCount={7}
        isCancelled={true}
      />
    );

    expect(screen.getByText('Download cancelled')).toBeInTheDocument();
    expect(
      screen.getByText('3 tracks downloaded before cancellation')
    ).toBeInTheDocument();
  });

  it('should render cancelled state with no tracks downloaded', () => {
    render(
      <CompletionPanel
        {...defaultProps}
        completedCount={0}
        cancelledCount={10}
        isCancelled={true}
      />
    );

    expect(screen.getByText('Download cancelled')).toBeInTheDocument();
    expect(screen.getByText('No tracks were downloaded')).toBeInTheDocument();
  });

  it('should render retry failed button when there are failures', () => {
    vi.mocked(useFailedTracks).mockReturnValue([
      {
        id: '1',
        title: 'Failed Track',
        artist: 'Artist',
        error: { code: 'NETWORK_ERROR', message: 'Network failed' },
      },
    ]);

    render(
      <CompletionPanel {...defaultProps} completedCount={9} failedCount={1} />
    );

    expect(
      screen.getByRole('button', { name: /retry failed/i })
    ).toBeInTheDocument();
  });

  it('should call retryAllFailed when retry button is clicked', async () => {
    const user = userEvent.setup();
    const mockRetryAll = vi.fn();
    vi.mocked(useRetryTracks).mockReturnValue({
      isRetrying: false,
      retryAllFailed: mockRetryAll,
      retrySingleTrack: vi.fn(),
      canRetry: true,
    });
    vi.mocked(useFailedTracks).mockReturnValue([
      {
        id: '1',
        title: 'Failed Track',
        artist: 'Artist',
        error: { code: 'NETWORK_ERROR', message: 'Network failed' },
      },
    ]);

    render(
      <CompletionPanel {...defaultProps} completedCount={9} failedCount={1} />
    );

    const retryButton = screen.getByRole('button', { name: /retry failed/i });
    await user.click(retryButton);

    expect(mockRetryAll).toHaveBeenCalledTimes(1);
  });
});
