import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadHistorySection } from '../components/DownloadHistorySection';

const mockEntries = [
  {
    id: '1',
    title: 'My Playlist',
    kind: 'Playlist' as const,
    artworkUrl: null,
    destDir: '/downloads',
    okCount: 5,
    failedCount: 1,
    cancelled: false,
    completedAt: Date.now(),
    tracks: [],
  },
];

const mockUseDownloadHistory = vi.fn();
const mockUseClearHistory = vi.fn();

vi.mock('../hooks/useDownloadHistory', () => ({
  useDownloadHistory: () => mockUseDownloadHistory(),
  useRemoveHistoryEntry: () => ({ mutate: vi.fn() }),
  useClearHistory: () => mockUseClearHistory(),
}));

vi.mock('../components/DownloadHistoryEntryRow', () => ({
  DownloadHistoryEntryRow: ({ entry }: { entry: { title: string } }) => <div>{entry.title}</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'downloadHistory.title': 'Download History',
        'downloadHistory.description': 'Browse your past downloads',
        'downloadHistory.empty': 'No downloads yet',
        'downloadHistory.clearAll': 'Clear all history',
        'downloadHistory.clearConfirmTitle': 'Clear download history?',
        'downloadHistory.clearConfirmBody': 'This will permanently remove all entries.',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

describe('DownloadHistorySection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseClearHistory.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('renders empty state when no entries', () => {
    mockUseDownloadHistory.mockReturnValue({ data: [], isLoading: false });
    render(<DownloadHistorySection />);
    expect(screen.getByText('No downloads yet')).toBeInTheDocument();
  });

  it('renders entries when history exists', () => {
    mockUseDownloadHistory.mockReturnValue({ data: mockEntries, isLoading: false });
    render(<DownloadHistorySection />);
    expect(screen.getByText('My Playlist')).toBeInTheDocument();
  });

  it('shows clear all button when entries exist', () => {
    mockUseDownloadHistory.mockReturnValue({ data: mockEntries, isLoading: false });
    render(<DownloadHistorySection />);
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });

  it('opens confirm dialog on clear all click', () => {
    mockUseDownloadHistory.mockReturnValue({ data: mockEntries, isLoading: false });
    render(<DownloadHistorySection />);
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(screen.getByText('Clear download history?')).toBeInTheDocument();
  });
});
