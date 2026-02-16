import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DownloadBar } from '../DownloadBar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'download.button': 'Download',
        'download.downloading': 'Downloading...',
        'settings.selectFolder': 'Select download folder',
        'settings.notSet': 'Not set',
        'settings.permissionDenied': 'Permission denied',
        'downloadBar.clickToChange': 'Click to change download folder',
        'downloadBar.customLocation': 'custom',
      };
      return translations[key] || key;
    },
  }),
}));

const mockOpen = vi.fn();
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: (...args: unknown[]) => mockOpen(...args),
}));

const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const mockDownloadPath = '/Users/test/Downloads';
vi.mock('@/features/settings/store', () => ({
  useSettingsStore: (selector: (state: { downloadPath: string }) => string) =>
    selector({ downloadPath: mockDownloadPath }),
}));

describe('DownloadBar', () => {
  const mockOnDownload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpen.mockResolvedValue(null);
    mockInvoke.mockResolvedValue(true);
  });

  describe('rendering', () => {
    it('renders the folder name from settings', () => {
      render(<DownloadBar onDownload={mockOnDownload} />);

      expect(screen.getByText('Downloads')).toBeInTheDocument();
    });

    it('renders the download button', () => {
      render(<DownloadBar onDownload={mockOnDownload} />);

      expect(screen.getByTestId('download-button')).toHaveTextContent('Download');
    });

    it('renders the folder selector button', () => {
      render(<DownloadBar onDownload={mockOnDownload} />);

      expect(screen.getByTestId('folder-selector')).toBeInTheDocument();
    });

    it('has correct test id on container', () => {
      render(<DownloadBar onDownload={mockOnDownload} />);

      expect(screen.getByTestId('download-bar')).toBeInTheDocument();
    });
  });

  describe('download button', () => {
    it('calls onDownload with current path when clicked', () => {
      render(<DownloadBar onDownload={mockOnDownload} />);

      fireEvent.click(screen.getByTestId('download-button'));

      expect(mockOnDownload).toHaveBeenCalledWith(mockDownloadPath);
    });

    it('is disabled when isDownloading is true', () => {
      render(<DownloadBar onDownload={mockOnDownload} isDownloading={true} />);

      expect(screen.getByTestId('download-button')).toBeDisabled();
    });

    it('shows downloading text when isDownloading is true', () => {
      render(<DownloadBar onDownload={mockOnDownload} isDownloading={true} />);

      expect(screen.getByTestId('download-button')).toHaveTextContent('Downloading...');
    });

    it('is enabled when isDownloading is false', () => {
      render(<DownloadBar onDownload={mockOnDownload} isDownloading={false} />);

      expect(screen.getByTestId('download-button')).not.toBeDisabled();
    });
  });

  describe('folder selection', () => {
    it('opens folder dialog when folder selector is clicked', async () => {
      render(<DownloadBar onDownload={mockOnDownload} />);

      fireEvent.click(screen.getByTestId('folder-selector'));

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith({
          directory: true,
          defaultPath: mockDownloadPath,
          title: 'Select download folder',
        });
      });
    });

    it('updates local path when folder is selected with permission', async () => {
      const newPath = '/Users/test/Music';
      mockOpen.mockResolvedValue(newPath);
      mockInvoke.mockResolvedValue(true);

      render(<DownloadBar onDownload={mockOnDownload} />);

      fireEvent.click(screen.getByTestId('folder-selector'));

      await waitFor(() => {
        expect(screen.getByText('Music')).toBeInTheDocument();
      });
    });

    it('shows custom indicator when path differs from default', async () => {
      const newPath = '/Users/test/Music';
      mockOpen.mockResolvedValue(newPath);
      mockInvoke.mockResolvedValue(true);

      render(<DownloadBar onDownload={mockOnDownload} />);

      fireEvent.click(screen.getByTestId('folder-selector'));

      await waitFor(() => {
        expect(screen.getByText('(custom)')).toBeInTheDocument();
      });
    });

    it('calls onDownload with overridden path after selection', async () => {
      const newPath = '/Users/test/Music';
      mockOpen.mockResolvedValue(newPath);
      mockInvoke.mockResolvedValue(true);

      render(<DownloadBar onDownload={mockOnDownload} />);

      fireEvent.click(screen.getByTestId('folder-selector'));

      await waitFor(() => {
        expect(screen.getByText('Music')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('download-button'));

      expect(mockOnDownload).toHaveBeenCalledWith(newPath);
    });

    it('shows error when selected folder has no write permission', async () => {
      const newPath = '/Users/test/Restricted';
      mockOpen.mockResolvedValue(newPath);
      mockInvoke.mockResolvedValue(false);

      render(<DownloadBar onDownload={mockOnDownload} />);

      fireEvent.click(screen.getByTestId('folder-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('folder-error')).toHaveTextContent('Permission denied');
      });
    });

    it('does not update path when user cancels dialog', async () => {
      mockOpen.mockResolvedValue(null);

      render(<DownloadBar onDownload={mockOnDownload} />);

      fireEvent.click(screen.getByTestId('folder-selector'));

      await waitFor(() => {
        expect(mockInvoke).not.toHaveBeenCalled();
      });

      expect(screen.getByText('Downloads')).toBeInTheDocument();
    });

    it('is disabled when isDownloading is true', () => {
      render(<DownloadBar onDownload={mockOnDownload} isDownloading={true} />);

      expect(screen.getByTestId('folder-selector')).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('shows error when dialog throws', async () => {
      mockOpen.mockRejectedValue(new Error('Dialog error'));

      render(<DownloadBar onDownload={mockOnDownload} />);

      fireEvent.click(screen.getByTestId('folder-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('folder-error')).toHaveTextContent('Permission denied');
      });
    });

    it('clears error when valid folder is selected', async () => {
      mockOpen.mockResolvedValueOnce('/restricted');
      mockInvoke.mockResolvedValueOnce(false);

      render(<DownloadBar onDownload={mockOnDownload} />);

      fireEvent.click(screen.getByTestId('folder-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('folder-error')).toBeInTheDocument();
      });

      mockOpen.mockResolvedValueOnce('/Users/test/Valid');
      mockInvoke.mockResolvedValueOnce(true);

      fireEvent.click(screen.getByTestId('folder-selector'));

      await waitFor(() => {
        expect(screen.queryByTestId('folder-error')).not.toBeInTheDocument();
      });
    });

    it('error has proper accessibility attributes', async () => {
      mockOpen.mockResolvedValue('/restricted');
      mockInvoke.mockResolvedValue(false);

      render(<DownloadBar onDownload={mockOnDownload} />);

      fireEvent.click(screen.getByTestId('folder-selector'));

      await waitFor(() => {
        const error = screen.getByTestId('folder-error');
        expect(error).toHaveAttribute('role', 'alert');
        expect(error).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });

  describe('accessibility', () => {
    it('folder selector has aria-label', () => {
      render(<DownloadBar onDownload={mockOnDownload} />);

      expect(screen.getByTestId('folder-selector')).toHaveAttribute(
        'aria-label',
        'Select download folder'
      );
    });

    it('folder selector is keyboard accessible', () => {
      render(<DownloadBar onDownload={mockOnDownload} />);

      const selector = screen.getByTestId('folder-selector');
      expect(selector.tagName).toBe('BUTTON');
      expect(selector).toHaveAttribute('type', 'button');
    });
  });
});
