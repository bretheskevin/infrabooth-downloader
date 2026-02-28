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

describe('UpdateBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUpdateStore.setState({
      updateAvailable: false,
      updateInfo: null,
      checkInProgress: false,
      lastChecked: null,
      dismissed: false,
    });
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
      'https://github.com/bretheskevin/soundcloud-downloader/releases/tag/v2.0.0'
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

    it('should have "Learn more" button before dismiss in tab order', () => {
      render(<UpdateBanner />);

      const learnMore = screen.getByRole('button', { name: 'Learn more' });
      const dismiss = screen.getByRole('button', { name: 'Dismiss' });

      // Both should be focusable
      expect(learnMore.tabIndex).not.toBe(-1);
      expect(dismiss.tabIndex).not.toBe(-1);

      // Learn more should come first in DOM order (which determines tab order)
      expect(
        learnMore.compareDocumentPosition(dismiss) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
  });

  describe('styling', () => {
    beforeEach(() => {
      useUpdateStore.setState({
        updateAvailable: true,
        updateInfo: { version: '2.0.0', body: null, date: null },
      });
    });

    it('should use info color scheme (blue/sky tones)', () => {
      render(<UpdateBanner />);

      const banner = screen.getByRole('status');
      expect(banner.className).toMatch(/bg-sky-50|bg-blue-50/);
      expect(banner.className).toMatch(/border-sky-200|border-blue-200/);
    });
  });
});
