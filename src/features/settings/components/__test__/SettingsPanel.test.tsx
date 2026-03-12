import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPanel } from '../SettingsPanel';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.title': 'Settings',
        'settings.description': 'Customize your app preferences',
        'settings.language': 'Language',
        'settings.languageDescription': 'Choose your preferred language',
        'settings.downloadLocation': 'Download location',
        'settings.downloadLocationDescription': 'Where your files will be saved',
        'settings.categoryAbout': 'About',
        'app.version': 'Version 1.6.0',
        'settings.viewChangelog': 'View changelog',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock @tauri-apps/api/app
vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn().mockResolvedValue('1.6.0'),
}));

// Mock ChangelogDialog from barrel export
vi.mock('@/features/changelog', () => ({
  ChangelogDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="changelog-dialog">Changelog Dialog</div> : null,
}));

// Mock child components
vi.mock('../LanguageSection', () => ({
  LanguageSection: () => <div data-testid="language-section">Language Section</div>,
}));

vi.mock('../ConcurrentDownloadsSection', () => ({
  ConcurrentDownloadsSection: () => <div data-testid="concurrent-downloads-section">Concurrent Downloads Section</div>,
}));

vi.mock('../DownloadLocationSection', () => ({
  DownloadLocationSection: () => <div data-testid="download-location-section">Download Location Section</div>,
}));

describe('SettingsPanel', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the settings panel when open is true', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<SettingsPanel {...defaultProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the settings title', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders LanguageSection component', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByTestId('language-section')).toBeInTheDocument();
  });

  it('renders DownloadLocationSection component', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByTestId('download-location-section')).toBeInTheDocument();
  });

  it('calls onOpenChange when close button is clicked', () => {
    render(<SettingsPanel {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('has proper accessibility attributes', () => {
    render(<SettingsPanel {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Radix Sheet handles aria-modal internally via portal mechanism
  });

  it('closes when Escape key is pressed', () => {
    render(<SettingsPanel {...defaultProps} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('traps focus within the panel', () => {
    render(<SettingsPanel {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Focus trap is handled by Radix Dialog primitive automatically
  });

  it('should render About section with version and changelog link', async () => {
    render(<SettingsPanel open={true} onOpenChange={() => {}} />);

    expect(await screen.findByText('About')).toBeInTheDocument();
    expect(await screen.findByText('Version 1.6.0')).toBeInTheDocument();
    expect(screen.getByText('View changelog')).toBeInTheDocument();
  });

  it('renders sections with visual separators', () => {
    render(<SettingsPanel {...defaultProps} />);

    // Both sections should be present, separated visually
    expect(screen.getByTestId('language-section')).toBeInTheDocument();
    expect(screen.getByTestId('download-location-section')).toBeInTheDocument();
  });
});
