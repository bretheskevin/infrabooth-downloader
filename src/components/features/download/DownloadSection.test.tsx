import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DownloadSection } from './DownloadSection';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'download.pasteUrl': 'Paste a SoundCloud playlist or track URL',
        'download.signInRequired': 'Sign in to download',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock authStore
const mockAuthStore = vi.fn();
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: { isSignedIn: boolean }) => boolean) => mockAuthStore(selector),
}));

describe('DownloadSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is signed in', () => {
    beforeEach(() => {
      mockAuthStore.mockImplementation((selector) => selector({ isSignedIn: true }));
    });

    it('should render URL input (AC #1)', () => {
      render(<DownloadSection />);

      expect(screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL')).toBeInTheDocument();
    });

    it('should have enabled input when signed in (AC #1)', () => {
      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      expect(input).not.toBeDisabled();
    });

    it('should NOT show auth prompt when signed in (AC #1)', () => {
      render(<DownloadSection />);

      expect(screen.queryByText('Sign in to download')).not.toBeInTheDocument();
    });

    it('should update URL state when input changes', () => {
      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/test' } });

      expect(input).toHaveValue('https://soundcloud.com/test');
    });
  });

  describe('when user is not signed in', () => {
    beforeEach(() => {
      mockAuthStore.mockImplementation((selector) => selector({ isSignedIn: false }));
    });

    it('should render URL input (AC #5)', () => {
      render(<DownloadSection />);

      expect(screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL')).toBeInTheDocument();
    });

    it('should have disabled input when not signed in (AC #5)', () => {
      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      expect(input).toBeDisabled();
    });

    it('should show auth prompt overlay when not signed in (AC #5)', () => {
      render(<DownloadSection />);

      expect(screen.getByText('Sign in to download')).toBeInTheDocument();
    });
  });
});
