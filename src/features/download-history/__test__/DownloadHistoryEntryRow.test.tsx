import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DownloadHistoryEntryRow } from '../components/DownloadHistoryEntryRow';
import { useOpenDownloadFolder } from '@/hooks/useOpenDownloadFolder';
import type { DownloadHistoryEntry } from '@/bindings';

vi.mock('../hooks/useDownloadHistory', () => ({
  useRemoveHistoryEntry: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/hooks/useOpenDownloadFolder', () => ({
  useOpenDownloadFolder: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'downloadHistory.okCount': `${opts?.count ?? 0} ok`,
        'downloadHistory.failedCount': `${opts?.count ?? 0} failed`,
        'downloadHistory.cancelled': 'cancelled',
        'downloadHistory.trackCount': `${opts?.count ?? 0} tracks`,
        'downloadHistory.removeEntry': 'Remove from history',
        'downloadHistory.openFolder': 'Open folder',
        'downloadHistory.kindTrack': 'Track',
        'downloadHistory.kindPlaylist': 'Playlist',
        'common.today': 'today',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

const baseEntry: DownloadHistoryEntry = {
  id: '1',
  title: 'Test Playlist',
  kind: 'Playlist',
  artworkUrl: null,
  destDir: '/downloads',
  okCount: 5,
  failedCount: 1,
  cancelled: false,
  completedAt: Date.now(),
  tracks: [
    { id: 't1', title: 'Track 1', artist: 'Artist 1', status: 'complete', reason: null },
    { id: 't2', title: 'Track 2', artist: 'Artist 2', status: 'failed', reason: 'drm_protected' },
  ],
};

function renderEntry(entry: DownloadHistoryEntry = baseEntry) {
  return render(
    <TooltipProvider>
      <DownloadHistoryEntryRow entry={entry} />
    </TooltipProvider>,
  );
}

describe('DownloadHistoryEntryRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOpenDownloadFolder).mockReturnValue(vi.fn());
  });

  it('renders entry title', () => {
    renderEntry();
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
  });

  it('shows summary with ok and failed counts', () => {
    renderEntry();
    expect(screen.getByText(/5 ok/)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/)).toBeInTheDocument();
  });

  it('expands to show tracks when clicked', () => {
    renderEntry();
    fireEvent.click(screen.getByRole('button', { name: /expand/i }));
    expect(screen.getByText('Track 1')).toBeInTheDocument();
    expect(screen.getByText('Track 2')).toBeInTheDocument();
  });

  it('shows cancelled badge for cancelled entries', () => {
    renderEntry({ ...baseEntry, cancelled: true });
    expect(screen.getByText('cancelled')).toBeInTheDocument();
  });

  it('shows remove button', () => {
    renderEntry();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('shows folderMissing toast when folder cannot be opened', () => {
    vi.mocked(useOpenDownloadFolder).mockImplementation((_dir, onError) =>
      vi.fn().mockImplementation(() => {
        onError?.();
      }),
    );

    renderEntry();

    fireEvent.click(screen.getByRole('button', { name: 'completion.openFolder' }));

    expect(toast.error).toHaveBeenCalledWith('downloadHistory.folderMissing');
  });
});
