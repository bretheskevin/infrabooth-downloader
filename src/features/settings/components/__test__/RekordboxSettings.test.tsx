import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQueryWrapper } from '@/test/queryWrapper';
import { RekordboxSettings } from '../RekordboxSettings';

const mockDetectRekordbox = vi.fn();
const mockSetRekordboxPathOverride = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'settings.categoryRekordbox': 'Rekordbox',
      'settings.rekordboxDescription': 'Download tracks and export them directly to Rekordbox.',
      'settings.rekordboxFound': 'Detected',
      'settings.rekordboxNotFoundBadge': 'Not found',
      'settings.rekordboxRunningBadge': 'Running',
      'settings.rekordboxNotFound': 'Rekordbox not found automatically. Choose your Rekordbox data directory if you use a custom location.',
      'settings.rekordboxRunning': 'Close Rekordbox before exporting or managing playlists.',
      'settings.rekordboxManualLabel': 'Rekordbox data directory',
      'settings.rekordboxUnexpectedError': 'Unable to check Rekordbox right now.',
      'settings.rekordboxLoading': 'Checking Rekordbox...',
      'settings.rekordboxRetry': 'Retry detection',
      'settings.rekordboxCustomPathLabel': 'Custom data directory',
      'settings.rekordboxClearOverride': 'Reset to auto-detection',
    }[key] || key),
  }),
}));

vi.mock('@/lib/tauri', () => ({
  api: {
    detectRekordbox: (...args: unknown[]) => mockDetectRekordbox(...args),
  },
}));

vi.mock('../RekordboxPathPicker', () => ({
  RekordboxPathPicker: ({ onPicked }: { onPicked: (path: string) => void }) => (
    <button onClick={() => onPicked('/Users/test/custom/master.db')}>Mock picker</button>
  ),
}));

const mockStoreState: Record<string, unknown> = {
  rekordboxPathOverride: '',
  setRekordboxPathOverride: mockSetRekordboxPathOverride,
};

vi.mock('@/features/settings/store', () => ({
  useSettingsStore: Object.assign(
    vi.fn((selector: (s: Record<string, unknown>) => unknown) => selector(mockStoreState)),
    { getState: () => mockStoreState },
  ),
}));

describe('RekordboxSettings', () => {
  const wrapper = createQueryWrapper();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.rekordboxPathOverride = '';
  });

  it('shows success state when auto detection works', async () => {
    mockDetectRekordbox.mockResolvedValue({ found: true, version: '6', dbPath: '/auto/master.db', isRunning: false });

    render(<RekordboxSettings />, { wrapper });

    const header = screen.getByTestId('rekordbox-header');
    expect(header).toContainElement(screen.getByRole('heading', { name: 'Rekordbox' }));

    const successBadge = await screen.findByText('Detected');
    expect(successBadge).toBeInTheDocument();
    expect(header).toContainElement(successBadge);
    expect(successBadge).toHaveClass('bg-green-500/10');
    expect(successBadge).toHaveClass('text-green-600');
    expect(screen.queryByText('Rekordbox data directory')).not.toBeInTheDocument();
    expect(screen.queryByText('Mock picker')).not.toBeInTheDocument();
  });

  it('detects using override path when one is saved', async () => {
    mockStoreState.rekordboxPathOverride = '/Users/test/saved/master.db';
    mockDetectRekordbox.mockResolvedValue({ found: true, version: '6', dbPath: '/Users/test/saved/master.db', isRunning: false });

    render(<RekordboxSettings />, { wrapper });

    const successBadge = await screen.findByText('Detected');
    const header = screen.getByTestId('rekordbox-header');
    expect(header).toContainElement(successBadge);
    expect(successBadge).toHaveClass('bg-green-500/10');
    expect(mockDetectRekordbox).toHaveBeenCalledTimes(1);
    expect(mockDetectRekordbox).toHaveBeenCalledWith('/Users/test/saved/master.db');
    expect(screen.queryByText('Rekordbox data directory')).not.toBeInTheDocument();
  });

  it('shows override section with clear button when found via override', async () => {
    mockStoreState.rekordboxPathOverride = '/Users/test/saved/master.db';
    mockDetectRekordbox.mockResolvedValue({ found: true, version: '6', dbPath: '/Users/test/saved/master.db', isRunning: false });

    render(<RekordboxSettings />, { wrapper });

    expect(await screen.findByText('Custom data directory')).toBeInTheDocument();
    expect(screen.getByText('/Users/test/saved/master.db')).toBeInTheDocument();
    expect(screen.getByText('Reset to auto-detection')).toBeInTheDocument();
    expect(screen.getByText('Mock picker')).toBeInTheDocument();
  });

  it('clears override when reset button is clicked', async () => {
    mockStoreState.rekordboxPathOverride = '/Users/test/saved/master.db';
    mockDetectRekordbox.mockResolvedValue({ found: true, version: '6', dbPath: '/Users/test/saved/master.db', isRunning: false });

    render(<RekordboxSettings />, { wrapper });

    const clearButton = await screen.findByText('Reset to auto-detection');
    await user.click(clearButton);

    expect(mockSetRekordboxPathOverride).toHaveBeenCalledWith('');
  });

  it('shows a running warning when Rekordbox is open', async () => {
    mockDetectRekordbox.mockResolvedValue({ found: true, version: '6', dbPath: '/auto/master.db', isRunning: true });

    render(<RekordboxSettings />, { wrapper });

    const header = screen.getByTestId('rekordbox-header');
    const runningBadge = await screen.findByText('Running');
    expect(header).toContainElement(runningBadge);
    expect(runningBadge).toHaveClass('bg-amber-500/10');
    expect(runningBadge).toHaveClass('text-amber-600');
    expect(screen.getByText('Close Rekordbox before exporting or managing playlists.')).toBeInTheDocument();
  });

  it('shows manual picker when override detection fails', async () => {
    mockStoreState.rekordboxPathOverride = '/Users/test/saved/master.db';
    mockDetectRekordbox.mockResolvedValue({ found: false, version: null, dbPath: null, isRunning: false });

    render(<RekordboxSettings />, { wrapper });

    const header = screen.getByTestId('rekordbox-header');
    const notFoundBadge = await screen.findByText('Not found');
    expect(header).toContainElement(notFoundBadge);
    expect(notFoundBadge).toHaveClass('bg-destructive/10');
    expect(notFoundBadge).toHaveClass('text-destructive');
    expect(await screen.findByText('Rekordbox not found automatically. Choose your Rekordbox data directory if you use a custom location.')).toBeInTheDocument();
    expect(screen.getByText('Rekordbox data directory')).toBeInTheDocument();
    expect(screen.getByText('Mock picker')).toBeInTheDocument();
  });

  it('shows a generic error with retry button when detection throws', async () => {
    mockDetectRekordbox.mockRejectedValue(new Error('boom'));

    render(<RekordboxSettings />, { wrapper });

    expect(await screen.findByText('Unable to check Rekordbox right now.')).toBeInTheDocument();
    expect(screen.getByText('Retry detection')).toBeInTheDocument();
  });
});
