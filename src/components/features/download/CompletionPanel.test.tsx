import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompletionPanel } from './CompletionPanel';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'completion.title': 'Download complete!',
        'completion.titlePartial': 'Download finished',
        'completion.allTracksDownloaded': `All ${options?.total} tracks downloaded`,
        'completion.tracksDownloaded': `${options?.completed} of ${options?.total} tracks downloaded`,
        'completion.openFolder': 'Open Folder',
        'completion.downloadAnother': 'Download Another',
        'completion.failedTracks': `${options?.count} tracks couldn't be downloaded`,
        'completion.failedTracksSingular': "1 track couldn't be downloaded",
        'completion.viewFailed': 'View details',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock shell commands
vi.mock('@/lib/shellCommands', () => ({
  openDownloadFolder: vi.fn(),
}));

// Mock settings store
vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: { downloadPath: string }) => string) =>
    selector({ downloadPath: '/Users/test/Downloads' }),
}));

import { openDownloadFolder } from '@/lib/shellCommands';

describe('CompletionPanel', () => {
  const defaultProps = {
    completedCount: 10,
    totalCount: 10,
    failedCount: 0,
    onDownloadAnother: vi.fn(),
    onViewFailedTracks: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render full success state correctly', () => {
    render(<CompletionPanel {...defaultProps} />);

    expect(screen.getByText('Download complete!')).toBeInTheDocument();
    expect(screen.getByText('All 10 tracks downloaded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open folder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download another/i })).toBeInTheDocument();
  });

  it('should render partial success state with failed tracks link', () => {
    render(
      <CompletionPanel
        {...defaultProps}
        completedCount={8}
        failedCount={2}
      />
    );

    expect(screen.getByText('Download finished')).toBeInTheDocument();
    expect(screen.getByText('8 of 10 tracks downloaded')).toBeInTheDocument();
    expect(
      screen.getByText("2 tracks couldn't be downloaded")
    ).toBeInTheDocument();
  });

  it('should not show failed tracks link when all succeed', () => {
    render(<CompletionPanel {...defaultProps} />);

    expect(
      screen.queryByText(/couldn't be downloaded/)
    ).not.toBeInTheDocument();
  });

  it('should call openDownloadFolder when Open Folder is clicked', async () => {
    const mockOpen = vi.mocked(openDownloadFolder);
    render(<CompletionPanel {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /open folder/i }));

    expect(mockOpen).toHaveBeenCalledWith('/Users/test/Downloads');
  });

  it('should call onDownloadAnother when Download Another is clicked', () => {
    const onDownloadAnother = vi.fn();
    render(
      <CompletionPanel {...defaultProps} onDownloadAnother={onDownloadAnother} />
    );

    fireEvent.click(screen.getByRole('button', { name: /download another/i }));

    expect(onDownloadAnother).toHaveBeenCalledTimes(1);
  });

  it('should call onViewFailedTracks when failed tracks link is clicked', () => {
    const onViewFailedTracks = vi.fn();
    render(
      <CompletionPanel
        {...defaultProps}
        completedCount={8}
        failedCount={2}
        onViewFailedTracks={onViewFailedTracks}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /couldn't be downloaded/i }));

    expect(onViewFailedTracks).toHaveBeenCalledTimes(1);
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
});
