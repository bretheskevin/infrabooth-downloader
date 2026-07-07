import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DownloadDashboard } from '../DownloadDashboard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useIsWidescreen', () => ({
  useIsWidescreen: () => true,
}));

vi.mock('@/features/progress/components/ProgressPanel', () => ({
  ProgressPanel: () => <div data-testid="progress-panel">ProgressPanel</div>,
}));

vi.mock('@/features/completion/components/CompletionPanel', () => ({
  CompletionPanel: (props: { onDownloadAnother: () => void }) => (
    <div data-testid="completion-panel" onClick={props.onDownloadAnother}>
      CompletionPanel
    </div>
  ),
}));

const mockQueueState = {
  isComplete: false,
  isProcessing: true,
  completedCount: 0,
  failedCount: 0,
  cancelledCount: 0,
  isCancelled: false,
  totalTracks: 5,
  tracks: [],
};

vi.mock('@/features/download-history', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/download-history')>();
  return { ...actual, useRecordDownloadHistory: () => {} };
});

vi.mock('@/features/queue', async () => {
  const actual = await vi.importActual('@/features/queue');
  const storeFn = vi.fn((selector: (s: typeof mockQueueState) => unknown) => selector(mockQueueState));
  return {
    ...actual,
    useQueueStore: Object.assign(storeFn, { getState: () => ({ clearQueue: vi.fn() }) }),
  };
});

describe('DownloadDashboard', () => {
  it('renders nothing when closed', () => {
    render(<DownloadDashboard isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('download.dashboard.title')).not.toBeInTheDocument();
  });

  it('renders ProgressPanel when open and processing', () => {
    render(<DownloadDashboard isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('progress-panel')).toBeInTheDocument();
  });

  it('renders CompletionPanel when open and complete', () => {
    mockQueueState.isComplete = true;
    mockQueueState.isProcessing = false;
    render(<DownloadDashboard isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('completion-panel')).toBeInTheDocument();
  });
});
