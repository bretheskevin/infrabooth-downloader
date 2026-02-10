import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadLocationSection } from './DownloadLocationSection';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.downloadLocation': 'Download location',
        'settings.downloadLocationDescription': 'Where your files will be saved',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock the FolderPicker component
vi.mock('./FolderPicker', () => ({
  FolderPicker: () => <div data-testid="folder-picker">Folder Picker</div>,
}));

describe('DownloadLocationSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the download location label', () => {
    render(<DownloadLocationSection />);

    expect(screen.getByText('Download location')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<DownloadLocationSection />);

    expect(screen.getByText('Where your files will be saved')).toBeInTheDocument();
  });

  it('renders the FolderPicker component', () => {
    render(<DownloadLocationSection />);

    expect(screen.getByTestId('folder-picker')).toBeInTheDocument();
  });

  it('has proper heading structure', () => {
    render(<DownloadLocationSection />);

    const label = screen.getByText('Download location');
    expect(label).toHaveClass('font-medium');
  });

  it('renders description with muted styling', () => {
    render(<DownloadLocationSection />);

    const description = screen.getByText('Where your files will be saved');
    expect(description).toHaveClass('text-muted-foreground');
  });
});
