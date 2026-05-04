import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsDialog } from '../SettingsDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.title': 'Settings',
        'settings.description': 'Customize your app preferences',
        'settings.categoryGeneral': 'General',
        'settings.categoryPlaylists': 'Playlists',
        'settings.categoryRekordbox': 'Rekordbox',
        'settings.categoryAbout': 'About',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn().mockResolvedValue('1.6.0'),
}));

vi.mock('@/features/changelog', () => ({
  ChangelogDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="changelog-dialog">Changelog Dialog</div> : null),
}));

vi.mock('../LanguageSection', () => ({
  LanguageSection: () => <div data-testid="language-section">Language Section</div>,
}));

vi.mock('../ThemeSection', () => ({
  ThemeSection: () => <div data-testid="theme-section">Theme Section</div>,
}));

vi.mock('../DownloadLocationSection', () => ({
  DownloadLocationSection: () => <div data-testid="download-location-section">Download Location</div>,
}));

vi.mock('../ConcurrentDownloadsSection', () => ({
  ConcurrentDownloadsSection: () => <div data-testid="concurrent-downloads-section">Concurrent Downloads</div>,
}));

vi.mock('../RekordboxSettings', () => ({
  RekordboxSettings: () => <div data-testid="rekordbox-settings">Rekordbox Settings</div>,
}));

vi.mock('../PlaylistOrderSection', () => ({
  PlaylistOrderSection: () => <div data-testid="playlist-order-section">Playlist Order</div>,
}));

describe('SettingsDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dialog when open', () => {
    render(<SettingsDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SettingsDialog {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders sidebar with all categories as tabs', () => {
    render(<SettingsDialog {...defaultProps} />);
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveAttribute('aria-orientation', 'vertical');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveTextContent('General');
    expect(tabs[1]).toHaveTextContent('Playlists');
    expect(tabs[2]).toHaveTextContent('Rekordbox');
    expect(tabs[3]).toHaveTextContent('About');
  });

  it('shows General settings by default with correct aria-selected', () => {
    render(<SettingsDialog {...defaultProps} />);
    const generalTab = screen.getByRole('tab', { name: /General/ });
    expect(generalTab).toHaveAttribute('aria-selected', 'true');

    expect(screen.getByTestId('language-section')).toBeInTheDocument();
    expect(screen.getByTestId('theme-section')).toBeInTheDocument();
    expect(screen.getByTestId('download-location-section')).toBeInTheDocument();
  });

  it('switches to Playlists settings when clicked', () => {
    render(<SettingsDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /Playlists/ }));

    expect(screen.getByRole('tab', { name: /Playlists/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /General/ })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('concurrent-downloads-section')).toBeInTheDocument();
    expect(screen.getByTestId('playlist-order-section')).toBeInTheDocument();
  });

  it('switches to Rekordbox settings when clicked', () => {
    render(<SettingsDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /Rekordbox/ }));
    expect(screen.getByTestId('rekordbox-settings')).toBeInTheDocument();
  });

  it('switches to About settings when clicked', async () => {
    render(<SettingsDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /About/ }));
    expect(await screen.findByText(/app\.version/)).toBeInTheDocument();
  });

  it('closes when Escape is pressed', () => {
    render(<SettingsDialog {...defaultProps} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange when close button is clicked', () => {
    render(<SettingsDialog {...defaultProps} />);
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('has proper tabpanel with correct aria attributes', () => {
    render(<SettingsDialog {...defaultProps} />);
    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toHaveAttribute('id', 'settings-tabpanel-general');
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'settings-tab-general');
  });

  it('navigates tabs with arrow keys', () => {
    render(<SettingsDialog {...defaultProps} />);
    const tablist = screen.getByRole('tablist');

    // ArrowDown moves to next tab
    fireEvent.keyDown(tablist, { key: 'ArrowDown' });
    expect(screen.getByRole('tab', { name: /Playlists/ })).toHaveAttribute('aria-selected', 'true');

    // ArrowDown again moves to Rekordbox
    fireEvent.keyDown(tablist, { key: 'ArrowDown' });
    expect(screen.getByRole('tab', { name: /Rekordbox/ })).toHaveAttribute('aria-selected', 'true');

    // ArrowDown again moves to About
    fireEvent.keyDown(tablist, { key: 'ArrowDown' });
    expect(screen.getByRole('tab', { name: /About/ })).toHaveAttribute('aria-selected', 'true');

    // ArrowDown wraps to General
    fireEvent.keyDown(tablist, { key: 'ArrowDown' });
    expect(screen.getByRole('tab', { name: /General/ })).toHaveAttribute('aria-selected', 'true');

    // ArrowUp moves to About (wrap)
    fireEvent.keyDown(tablist, { key: 'ArrowUp' });
    expect(screen.getByRole('tab', { name: /About/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('navigates to first/last tab with Home/End keys', () => {
    render(<SettingsDialog {...defaultProps} />);
    const tablist = screen.getByRole('tablist');

    // End moves to last tab
    fireEvent.keyDown(tablist, { key: 'End' });
    expect(screen.getByRole('tab', { name: /About/ })).toHaveAttribute('aria-selected', 'true');

    // Home moves to first tab
    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(screen.getByRole('tab', { name: /General/ })).toHaveAttribute('aria-selected', 'true');
  });
});
