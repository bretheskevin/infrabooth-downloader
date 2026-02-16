import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DownloadLocationSection } from '../DownloadLocationSection';

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

vi.mock('../FolderPicker', () => ({
  FolderPicker: () => <div data-testid="folder-picker">Folder Picker</div>,
}));

describe('DownloadLocationSection', () => {
  it('renders the download location label', () => {
    render(<DownloadLocationSection />);
    expect(screen.getByText('Download location')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<DownloadLocationSection />);
    expect(screen.getByText('Where your files will be saved')).toBeInTheDocument();
  });

  it('renders the FolderPicker component', () => {
    render(<DownloadLocationSection />);
    expect(screen.getByTestId('folder-picker')).toBeInTheDocument();
  });

  it('has the correct test id', () => {
    render(<DownloadLocationSection />);
    expect(screen.getByTestId('download-location-section')).toBeInTheDocument();
  });
});
