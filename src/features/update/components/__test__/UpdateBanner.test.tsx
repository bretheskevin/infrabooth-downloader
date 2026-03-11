import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateBanner } from '../UpdateBanner';
import { useUpdateStore } from '../../store';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'update.available': `Update available: v${opts?.version ?? ''}`,
        'update.learnMore': 'Learn more',
        'update.dismiss': 'Dismiss',
        'update.updateNow': 'Update now',
        'update.installing': 'Installing...',
        'update.installed': 'Update installed — restart to apply',
        'update.installError': 'Update failed — click to retry',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock @tauri-apps/plugin-shell
const mockOpen = vi.fn().mockResolvedValue(undefined);
vi.mock('@tauri-apps/plugin-shell', () => ({
  open: (...args: unknown[]) => mockOpen(...args),
}));

const defaultState = {
  updateAvailable: false,
  updateInfo: null,
  checkInProgress: false,
  lastChecked: null,
  dismissed: false,
  installing: false,
  installError: null,
  installed: false,
};

describe('UpdateBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUpdateStore.setState(defaultState);
  });

  it('should render when update is available', () => {
    useUpdateStore.setState({
      updateAvailable: true,
      updateInfo: { version: '2.0.0', body: 'New features', date: '2026-01-01' },
    });

    render(<UpdateBanner />);

    expect(screen.getByText('Update available: v2.0.0')).toBeInTheDocument();
  });

  it('should not render when no update is available', () => {
    useUpdateStore.setState({ updateAvailable: false });

    const { container } = render(<UpdateBanner />);

    expect(container.firstChild).toBeNull();
  });

  it('should not render when dismissed this session', () => {
    useUpdateStore.setState({
      updateAvailable: true,
      updateInfo: { version: '2.0.0', body: null, date: null },
      dismissed: true,
    });

    const { container } = render(<UpdateBanner />);

    expect(container.firstChild).toBeNull();
  });

  it('should have an "Update now" button', () => {
    useUpdateStore.setState({
      updateAvailable: true,
      updateInfo: { version: '2.0.0', body: null, date: null },
    });

    render(<UpdateBanner />);

    expect(screen.getByRole('button', { name: 'Update now' })).toBeInTheDocument();
  });

  it('should call installUpdate when "Update now" is clicked', () => {
    const installSpy = vi.fn();
    useUpdateStore.setState({
      updateAvailable: true,
      updateInfo: { version: '2.0.0', body: null, date: null },
      installUpdate: installSpy,
    });

    render(<UpdateBanner />);

    fireEvent.click(screen.getByRole('button', { name: 'Update now' }));

    expect(installSpy).toHaveBeenCalledOnce();
  });

  it('should have a "Learn more" button', () => {
    useUpdateStore.setState({
      updateAvailable: true,
      updateInfo: { version: '2.0.0', body: null, date: null },
    });

    render(<UpdateBanner />);

    expect(screen.getByRole('button', { name: 'Learn more' })).toBeInTheDocument();
  });

  it('should open GitHub releases URL when "Learn more" is clicked', async () => {
    useUpdateStore.setState({
      updateAvailable: true,
      updateInfo: { version: '2.0.0', body: null, date: null },
    });

    render(<UpdateBanner />);

    const learnMoreButton = screen.getByRole('button', { name: 'Learn more' });
    fireEvent.click(learnMoreButton);

    expect(mockOpen).toHaveBeenCalledWith(
      'https://github.com/bretheskevin/infrabooth-downloader/releases/tag/v2.0.0'
    );
  });

  it('should have a dismiss button', () => {
    useUpdateStore.setState({
      updateAvailable: true,
      updateInfo: { version: '2.0.0', body: null, date: null },
    });

    render(<UpdateBanner />);

    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('should call dismissUpdate when dismiss button is clicked', () => {
    useUpdateStore.setState({
      updateAvailable: true,
      updateInfo: { version: '2.0.0', body: null, date: null },
    });

    render(<UpdateBanner />);

    const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
    fireEvent.click(dismissButton);

    expect(useUpdateStore.getState().dismissed).toBe(true);
  });

  it('should hide banner after dismiss', () => {
    useUpdateStore.setState({
      updateAvailable: true,
      updateInfo: { version: '2.0.0', body: null, date: null },
    });

    const { container, rerender } = render(<UpdateBanner />);
    expect(screen.getByText('Update available: v2.0.0')).toBeInTheDocument();

    // Dismiss
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    // Re-render to pick up store change
    rerender(<UpdateBanner />);

    expect(container.firstChild).toBeNull();
  });

  describe('installing state', () => {
    beforeEach(() => {
      useUpdateStore.setState({
        updateAvailable: true,
        updateInfo: { version: '2.0.0', body: null, date: null },
        installing: true,
      });
    });

    it('should show "Installing..." text', () => {
      render(<UpdateBanner />);

      expect(screen.getByText('Installing...')).toBeInTheDocument();
    });

    it('should disable "Update now" button while installing', () => {
      render(<UpdateBanner />);

      const updateButton = screen.getByRole('button', { name: 'Installing...' });
      expect(updateButton).toBeDisabled();
    });

    it('should disable "Learn more" button while installing', () => {
      render(<UpdateBanner />);

      const learnMoreButton = screen.getByRole('button', { name: 'Learn more' });
      expect(learnMoreButton).toBeDisabled();
    });
  });

  describe('installed state', () => {
    beforeEach(() => {
      useUpdateStore.setState({
        updateAvailable: true,
        updateInfo: { version: '2.0.0', body: null, date: null },
        installed: true,
      });
    });

    it('should show installed message', () => {
      render(<UpdateBanner />);

      expect(screen.getByText('Update installed — restart to apply')).toBeInTheDocument();
    });

    it('should not show "Update now" button after installation', () => {
      render(<UpdateBanner />);

      expect(screen.queryByRole('button', { name: 'Update now' })).not.toBeInTheDocument();
    });

    it('should not show "Learn more" button after installation', () => {
      render(<UpdateBanner />);

      expect(screen.queryByRole('button', { name: 'Learn more' })).not.toBeInTheDocument();
    });

    it('should still show dismiss button', () => {
      render(<UpdateBanner />);

      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    beforeEach(() => {
      useUpdateStore.setState({
        updateAvailable: true,
        updateInfo: { version: '2.0.0', body: null, date: null },
        installError: 'Download failed',
      });
    });

    it('should show error message', () => {
      render(<UpdateBanner />);

      expect(screen.getByText('Update failed — click to retry')).toBeInTheDocument();
    });

    it('should still show "Update now" button for retry', () => {
      render(<UpdateBanner />);

      expect(screen.getByRole('button', { name: 'Update now' })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      useUpdateStore.setState({
        updateAvailable: true,
        updateInfo: { version: '2.0.0', body: null, date: null },
      });
    });

    it('should have role="status" on banner container', () => {
      render(<UpdateBanner />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-live="polite"', () => {
      render(<UpdateBanner />);

      const banner = screen.getByRole('status');
      expect(banner).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-label on dismiss button', () => {
      render(<UpdateBanner />);

      const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss');
    });

    it('should have "Update now" button before "Learn more" in tab order', () => {
      render(<UpdateBanner />);

      const updateNow = screen.getByRole('button', { name: 'Update now' });
      const learnMore = screen.getByRole('button', { name: 'Learn more' });

      expect(updateNow.tabIndex).not.toBe(-1);
      expect(learnMore.tabIndex).not.toBe(-1);

      expect(
        updateNow.compareDocumentPosition(learnMore) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('should use info color scheme when update available', () => {
      useUpdateStore.setState({
        updateAvailable: true,
        updateInfo: { version: '2.0.0', body: null, date: null },
      });

      render(<UpdateBanner />);

      const banner = screen.getByRole('status');
      expect(banner.className).toMatch(/bg-sky-50/);
    });

    it('should use green color scheme when installed', () => {
      useUpdateStore.setState({
        updateAvailable: true,
        updateInfo: { version: '2.0.0', body: null, date: null },
        installed: true,
      });

      render(<UpdateBanner />);

      const banner = screen.getByRole('status');
      expect(banner.className).toMatch(/bg-green-50/);
    });

    it('should use amber color scheme on error', () => {
      useUpdateStore.setState({
        updateAvailable: true,
        updateInfo: { version: '2.0.0', body: null, date: null },
        installError: 'Failed',
      });

      render(<UpdateBanner />);

      const banner = screen.getByRole('status');
      expect(banner.className).toMatch(/bg-amber-50/);
    });
  });
});
