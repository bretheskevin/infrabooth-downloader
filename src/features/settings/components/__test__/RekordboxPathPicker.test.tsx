import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RekordboxPathPicker } from '../RekordboxPathPicker';

const mockSetRekordboxPathOverride = vi.fn();
const mockOnPicked = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'settings.rekordboxSelectDirectory': 'Select Rekordbox data directory',
      'settings.browse': 'Browse',
      'settings.notSet': 'Not set',
    }[key] || key),
  }),
}));

vi.mock('@/features/settings/api/folderDialog', () => ({
  selectFolder: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({
  api: {
    getDefaultRekordboxDataDirectoryParent: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('@/features/settings/store', () => ({
  useSettingsStore: Object.assign(
    vi.fn((selector: (s: Record<string, unknown>) => unknown) => selector({
      rekordboxPathOverride: '',
      setRekordboxPathOverride: mockSetRekordboxPathOverride,
    })),
    { getState: () => ({ setRekordboxPathOverride: mockSetRekordboxPathOverride }) },
  ),
}));

import { selectFolder } from '@/features/settings/api/folderDialog';
import { api } from '@/lib/tauri';

describe('RekordboxPathPicker', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens folder selection with the default rekordbox parent directory', async () => {
    vi.mocked(api.getDefaultRekordboxDataDirectoryParent).mockResolvedValue('/Users/test/Library/Pioneer');
    vi.mocked(selectFolder).mockResolvedValue(null);

    render(
      <TooltipProvider>
        <RekordboxPathPicker onPicked={mockOnPicked} />
      </TooltipProvider>
    );

    await user.click(screen.getByRole('button', { name: /select rekordbox data directory/i }));

    await waitFor(() => {
      expect(selectFolder).toHaveBeenCalledWith({
        defaultPath: '/Users/test/Library/Pioneer',
        title: 'Select Rekordbox data directory',
      });
    });
  });

  it('stores the selected data directory path', async () => {
    vi.mocked(api.getDefaultRekordboxDataDirectoryParent).mockResolvedValue('/Users/test/Library/Pioneer');
    vi.mocked(selectFolder).mockResolvedValue('/Users/test/Library/Pioneer/rekordbox');

    render(
      <TooltipProvider>
        <RekordboxPathPicker onPicked={mockOnPicked} />
      </TooltipProvider>
    );

    await user.click(screen.getByRole('button', { name: /select rekordbox data directory/i }));

    await waitFor(() => {
      expect(mockSetRekordboxPathOverride).toHaveBeenCalledWith('/Users/test/Library/Pioneer/rekordbox');
      expect(mockOnPicked).toHaveBeenCalledWith('/Users/test/Library/Pioneer/rekordbox');
    });
  });
});
