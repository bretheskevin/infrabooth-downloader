import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQueryWrapper } from '@/test/queryWrapper';
import { RekordboxSettings } from '../RekordboxSettings';

const mockDetectRekordbox = vi.fn();
const mockSetRekordboxPathOverride = vi.fn();
const mockSelectFolder = vi.fn();

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
      'settings.rekordboxClearOverride': 'Reset to auto-detection',
      'settings.rekordboxSelectDirectory': 'Select Rekordbox directory',
      'settings.browse': 'Browse',
      'settings.notSet': 'Not set',
    }[key] || key),
  }),
}));

vi.mock('@/lib/tauri', () => ({
  api: {
    detectRekordbox: (...args: unknown[]) => mockDetectRekordbox(...args),
  },
}));

vi.mock('@/hooks', () => ({
  useFolderSelection: () => ({ selectFolder: mockSelectFolder, error: null }),
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

    const successBadge = await screen.findByText('Detected');
    expect(successBadge).toBeInTheDocument();
    expect(successBadge).toHaveClass('bg-green-500/10');
    expect(successBadge).toHaveClass('text-green-600');
    expect(screen.queryByText('Rekordbox data directory')).not.toBeInTheDocument();
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
  });

  it('shows path section with browse and clear when found via override', async () => {
    mockStoreState.rekordboxPathOverride = '/Users/test/saved/master.db';
    mockDetectRekordbox.mockResolvedValue({ found: true, version: '6', dbPath: '/Users/test/saved/master.db', isRunning: false });

    render(<RekordboxSettings />, { wrapper });

    expect(await screen.findByText('Rekordbox data directory')).toBeInTheDocument();
    expect(screen.getByText('/Users/test/saved/master.db')).toBeInTheDocument();
    expect(screen.getByText('Browse')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset to auto-detection' })).toBeInTheDocument();
  });

  it('clears override when clear button is clicked', async () => {
    mockStoreState.rekordboxPathOverride = '/Users/test/saved/master.db';
    mockDetectRekordbox.mockResolvedValue({ found: true, version: '6', dbPath: '/Users/test/saved/master.db', isRunning: false });

    render(<RekordboxSettings />, { wrapper });

    const clearButton = await screen.findByRole('button', { name: 'Reset to auto-detection' });
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

  it('shows browse with explanation when not found', async () => {
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
    expect(screen.getByText('Browse')).toBeInTheDocument();
  });

  it('shows a generic error with retry button when detection throws', async () => {
    mockDetectRekordbox.mockRejectedValue(new Error('boom'));

    render(<RekordboxSettings />, { wrapper });

    expect(await screen.findByText('Unable to check Rekordbox right now.')).toBeInTheDocument();
    expect(screen.getByText('Retry detection')).toBeInTheDocument();
  });
});
