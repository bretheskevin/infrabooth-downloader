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
    t: (key: string) =>
      ({
        'settings.categoryRekordbox': 'Rekordbox',
        'settings.rekordboxDescription': 'Download tracks and export them directly to Rekordbox.',
        'settings.rekordboxFound': 'Detected',
        'settings.rekordboxNotFoundBadge': 'Not found',
        'settings.rekordboxRunningBadge': 'Running',
        'settings.rekordboxNotFound':
          'Rekordbox not found automatically. Choose your Rekordbox data directory if you use a custom location.',
        'settings.rekordboxRunning': 'Close Rekordbox before exporting or managing playlists.',
        'settings.rekordboxManualLabel': 'Rekordbox data directory',
        'settings.rekordboxUnexpectedError': 'Unable to check Rekordbox right now.',
        'settings.rekordboxLoading': 'Checking Rekordbox...',
        'settings.rekordboxRetry': 'Retry detection',
        'settings.rekordboxClearOverride': 'Reset to auto-detection',
        'settings.rekordboxSelectDirectory': 'Select Rekordbox directory',
        'settings.browse': 'Browse',
        'settings.notSet': 'Not set',
        'settings.rekordboxDefaultExportLabel': 'Default export folder',
        'settings.rekordboxDefaultExportDescription': 'Choose where new playlists are created in Rekordbox.',
        'settings.rekordboxDefaultExportDefault': 'InfraBooth Downloader (default)',
        'settings.rekordboxDefaultExportChange': 'Change',
        'settings.rekordboxDefaultExportReset': 'Reset to default',
        'settings.rekordboxDefaultExportDeleted': 'The saved export folder no longer exists in Rekordbox. Reset to default.',
        'settings.rekordboxDefaultExportLoadingTree': 'Loading folders...',
      })[key] || key,
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

const mockUseRekordboxTree = vi.fn().mockReturnValue({ data: undefined, isLoading: false, isError: false, retry: vi.fn() });

vi.mock('@/features/rekordbox-export/hooks/useRekordboxTree', () => ({
  useRekordboxTree: (...args: unknown[]) => mockUseRekordboxTree(...args),
}));

const mockSetRekordboxDefaultExportFolderId = vi.fn();

const mockStoreState: Record<string, unknown> = {
  rekordboxPathOverride: '',
  setRekordboxPathOverride: mockSetRekordboxPathOverride,
  rekordboxDefaultExportFolderId: null,
  setRekordboxDefaultExportFolderId: mockSetRekordboxDefaultExportFolderId,
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
    mockStoreState.rekordboxDefaultExportFolderId = null;
    mockUseRekordboxTree.mockReturnValue({ data: undefined, isLoading: false, isError: false, retry: vi.fn() });
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
    expect(
      await screen.findByText('Rekordbox not found automatically. Choose your Rekordbox data directory if you use a custom location.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Rekordbox data directory')).toBeInTheDocument();
    expect(screen.getByText('Browse')).toBeInTheDocument();
  });

  it('shows a generic error with retry button when detection throws', async () => {
    mockDetectRekordbox.mockRejectedValue(new Error('boom'));

    render(<RekordboxSettings />, { wrapper });

    expect(await screen.findByText('Unable to check Rekordbox right now.')).toBeInTheDocument();
    expect(screen.getByText('Retry detection')).toBeInTheDocument();
  });

  describe('default export folder section', () => {
    it('shows default export folder section when found and not running', async () => {
      mockDetectRekordbox.mockResolvedValue({ found: true, version: '6', dbPath: '/auto/master.db', isRunning: false });

      render(<RekordboxSettings />, { wrapper });

      expect(await screen.findByText('Default export folder')).toBeInTheDocument();
      expect(screen.getByText('InfraBooth Downloader (default)')).toBeInTheDocument();
      expect(screen.getByText('Change')).toBeInTheDocument();
    });

    it('does not show default export folder section when running', async () => {
      mockDetectRekordbox.mockResolvedValue({ found: true, version: '6', dbPath: '/auto/master.db', isRunning: true });

      render(<RekordboxSettings />, { wrapper });

      await screen.findByText('Running');
      expect(screen.queryByText('Default export folder')).not.toBeInTheDocument();
    });

    it('shows resolved folder name when a folder is selected', async () => {
      mockStoreState.rekordboxDefaultExportFolderId = 'folder-1';
      mockUseRekordboxTree.mockReturnValue({
        data: [{ id: 'folder-1', name: 'My Folder', attribute: 1, parentId: 'root', seq: 1 }],
        isLoading: false,
        isError: false,
        retry: vi.fn(),
      });
      mockDetectRekordbox.mockResolvedValue({ found: true, version: '6', dbPath: '/auto/master.db', isRunning: false });

      render(<RekordboxSettings />, { wrapper });

      expect(await screen.findByText('My Folder')).toBeInTheDocument();
      expect(screen.getByText('Reset to default')).toBeInTheDocument();
    });

    it('shows warning when stored folder does not exist in tree', async () => {
      mockStoreState.rekordboxDefaultExportFolderId = 'nonexistent-folder';
      mockUseRekordboxTree.mockReturnValue({
        data: [{ id: 'folder-1', name: 'My Folder', attribute: 1, parentId: 'root', seq: 1 }],
        isLoading: false,
        isError: false,
        retry: vi.fn(),
      });
      mockDetectRekordbox.mockResolvedValue({ found: true, version: '6', dbPath: '/auto/master.db', isRunning: false });

      render(<RekordboxSettings />, { wrapper });

      expect(await screen.findByText('The saved export folder no longer exists in Rekordbox. Reset to default.')).toBeInTheDocument();
    });

    it('resets default folder when reset button is clicked', async () => {
      mockStoreState.rekordboxDefaultExportFolderId = 'folder-1';
      mockUseRekordboxTree.mockReturnValue({
        data: [{ id: 'folder-1', name: 'My Folder', attribute: 1, parentId: 'root', seq: 1 }],
        isLoading: false,
        isError: false,
        retry: vi.fn(),
      });
      mockDetectRekordbox.mockResolvedValue({ found: true, version: '6', dbPath: '/auto/master.db', isRunning: false });

      render(<RekordboxSettings />, { wrapper });

      const resetButton = await screen.findByText('Reset to default');
      await user.click(resetButton);

      expect(mockSetRekordboxDefaultExportFolderId).toHaveBeenCalledWith(null);
    });
  });
});
