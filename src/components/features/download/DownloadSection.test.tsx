import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DownloadSection } from './DownloadSection';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'download.pasteUrl': 'Paste a SoundCloud playlist or track URL',
        'download.signInRequired': 'Sign in to download',
        'download.validPlaylist': 'Valid playlist URL',
        'download.validTrack': 'Valid track URL',
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

// Mock validation
const mockValidateUrl = vi.fn();
vi.mock('@/lib/validation', () => ({
  validateUrl: (url: string) => mockValidateUrl(url),
}));

describe('DownloadSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  describe('validation feedback integration (Story 3.3)', () => {
    beforeEach(() => {
      mockAuthStore.mockImplementation((selector) => selector({ isSignedIn: true }));
    });

    it('should show success feedback after valid URL validation (AC #2)', async () => {
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'playlist',
      });

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/artist/sets/playlist' } });

      // Advance past debounce and allow promise to resolve
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(screen.getByText('Valid playlist URL')).toBeInTheDocument();
    });

    it('should show error feedback after invalid URL validation (AC #3)', async () => {
      mockValidateUrl.mockResolvedValue({
        valid: false,
        error: {
          code: 'INVALID_URL',
          message: 'Not a SoundCloud URL',
          hint: 'Paste a link from soundcloud.com',
        },
      });

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://example.com' } });

      // Advance past debounce and allow promise to resolve
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(screen.getByText('Not a SoundCloud URL')).toBeInTheDocument();
      expect(screen.getByText('Paste a link from soundcloud.com')).toBeInTheDocument();
    });

    it('should clear validation result when input is cleared (AC #4)', async () => {
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'track',
      });

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');

      // First, enter a valid URL
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/artist/track' } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(screen.getByText('Valid track URL')).toBeInTheDocument();

      // Now clear the input
      fireEvent.change(input, { target: { value: '' } });

      // Wait for state to update
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.queryByText('Valid track URL')).not.toBeInTheDocument();
    });

    it('should debounce validation calls (AC #2 timing)', async () => {
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'track',
      });

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');

      // Type multiple characters quickly
      fireEvent.change(input, { target: { value: 'h' } });
      fireEvent.change(input, { target: { value: 'ht' } });
      fireEvent.change(input, { target: { value: 'htt' } });
      fireEvent.change(input, { target: { value: 'https://soundcloud.com' } });

      // Before debounce completes
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      expect(mockValidateUrl).not.toHaveBeenCalled();

      // After debounce
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(mockValidateUrl).toHaveBeenCalledTimes(1);
      expect(mockValidateUrl).toHaveBeenCalledWith('https://soundcloud.com');
    });

    it('should auto-dismiss success border after 2 seconds (AC #2)', async () => {
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'track',
      });

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/track' } });

      // Advance past debounce
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      // Success border should be visible
      expect(input).toHaveClass('border-emerald-500');

      // After 2 seconds, success border should fade
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      // Border should return to default (no emerald)
      expect(input).not.toHaveClass('border-emerald-500');
    });
  });
});
