import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DownloadDock } from '../DownloadDock';
import type { DownloadDockState } from '../../hooks/useDownloadDockState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'download.dock.progressOf') return `${opts?.current}/${opts?.total}`;
      return key;
    },
  }),
}));

vi.mock('@/hooks/useIsWidescreen', () => ({
  useIsWidescreen: () => true,
}));

vi.mock('@/features/player/hooks/useIsExpandedBarVisible', () => ({
  useIsExpandedBarVisible: () => false,
}));

vi.mock('@/features/player/components/ExpandedBar', () => ({
  EXPANDED_BAR_HEIGHT: 90,
}));

const mockOpenDashboard = vi.fn();
const mockDismissDock = vi.fn();

function createDockState(overrides: Partial<DownloadDockState> = {}): DownloadDockState {
  return {
    isVisible: true,
    status: 'processing',
    totalTracks: 5,
    doneCount: 2,
    completedCount: 2,
    failedCount: 0,
    cancelledCount: 0,
    percentage: 40,
    isCancelling: false,
    isDashboardOpen: false,
    openDashboard: mockOpenDashboard,
    closeDashboard: vi.fn(),
    dismissDock: mockDismissDock,
    ...overrides,
  };
}

describe('DownloadDock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(<DownloadDock dockState={createDockState({ isVisible: false })} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders progress when processing', () => {
    render(<DownloadDock dockState={createDockState({ status: 'processing', percentage: 40 })} />);
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('shows preparing status when initializing', () => {
    render(<DownloadDock dockState={createDockState({ status: 'initializing' })} />);
    expect(screen.getByText('download.dock.preparing')).toBeInTheDocument();
  });

  it('calls openDashboard when details button clicked', async () => {
    const user = userEvent.setup();
    render(<DownloadDock dockState={createDockState()} />);
    await user.click(screen.getByRole('button', { name: /download\.dock\.openDashboard/i }));
    expect(mockOpenDashboard).toHaveBeenCalled();
  });

  it('shows cancelled label and dismiss button when status is cancelled', async () => {
    const user = userEvent.setup();
    render(<DownloadDock dockState={createDockState({ status: 'cancelled', cancelledCount: 3 })} />);
    expect(screen.getByText('download.dock.cancelled')).toBeInTheDocument();
    expect(screen.queryByText('download.dock.complete')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /download\.dock\.dismiss/i }));
    expect(mockDismissDock).toHaveBeenCalled();
  });

  it('calls dismissDock when dismiss button clicked', async () => {
    const user = userEvent.setup();
    render(<DownloadDock dockState={createDockState({ status: 'complete' })} />);
    await user.click(screen.getByRole('button', { name: /download\.dock\.dismiss/i }));
    expect(mockDismissDock).toHaveBeenCalled();
  });
});
