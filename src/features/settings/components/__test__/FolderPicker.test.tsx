import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FolderPicker } from '../FolderPicker';

// Mock Tauri dialog plugin
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

// Mock Tauri core invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'settings.downloadLocation': 'Download Location',
        'settings.browse': 'Browse',
        'settings.currentPath': `Current: ${params?.path || ''}`,
        'settings.permissionDenied': 'Cannot write to this folder. Please select a different location.',
        'settings.selectFolder': 'Select download folder',
        'settings.notSet': 'Not set',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock settingsStore
const mockSetDownloadPath = vi.fn();
vi.mock('@/features/settings/store', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      downloadPath: '/Users/test/Downloads',
      setDownloadPath: mockSetDownloadPath,
    };
    return selector ? selector(state) : state;
  }),
}));

import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

describe('FolderPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders current download path', () => {
    render(<FolderPicker />);

    expect(screen.getByText('/Users/test/Downloads')).toBeInTheDocument();
  });

  it('renders browse button with correct label', () => {
    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: /select download folder/i });
    expect(browseButton).toBeInTheDocument();
    expect(browseButton).toHaveTextContent('Browse');
  });

  it('renders download location label', () => {
    render(<FolderPicker />);

    expect(screen.getByText('Download Location')).toBeInTheDocument();
  });

  it('opens folder dialog when browse button is clicked', async () => {
    vi.mocked(open).mockResolvedValue('/Users/test/NewFolder');
    vi.mocked(invoke).mockResolvedValue(true);

    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: /select download folder/i });
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(open).toHaveBeenCalledWith({
        directory: true,
        defaultPath: '/Users/test/Downloads',
        title: 'Select download folder',
      });
    });
  });

  it('updates store when folder is selected with write permission', async () => {
    vi.mocked(open).mockResolvedValue('/Users/test/NewFolder');
    vi.mocked(invoke).mockResolvedValue(true);

    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: /select download folder/i });
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('check_write_permission', {
        path: '/Users/test/NewFolder',
      });
      expect(mockSetDownloadPath).toHaveBeenCalledWith('/Users/test/NewFolder');
    });
  });

  it('shows error when selected folder has no write permission', async () => {
    vi.mocked(open).mockResolvedValue('/Users/test/ReadOnlyFolder');
    vi.mocked(invoke).mockResolvedValue(false);

    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: /select download folder/i });
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Cannot write to this folder. Please select a different location.'
      );
    });

    expect(mockSetDownloadPath).not.toHaveBeenCalled();
  });

  it('does not update store when user cancels dialog', async () => {
    vi.mocked(open).mockResolvedValue(null);

    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: /select download folder/i });
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(open).toHaveBeenCalled();
    });

    expect(invoke).not.toHaveBeenCalled();
    expect(mockSetDownloadPath).not.toHaveBeenCalled();
  });

  it('has accessible aria labels', () => {
    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: /select download folder/i });
    expect(browseButton).toHaveAttribute('aria-label', 'Select download folder');

    const pathDisplay = screen.getByLabelText(/current:/i);
    expect(pathDisplay).toBeInTheDocument();
  });

  it('is keyboard navigable', () => {
    render(<FolderPicker />);

    const browseButton = screen.getByRole('button', { name: /select download folder/i });
    browseButton.focus();

    expect(document.activeElement).toBe(browseButton);
  });
});
