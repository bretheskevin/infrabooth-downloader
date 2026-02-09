import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { DownloadSection } from './DownloadSection';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      const translations: Record<string, string> = {
        'download.pasteUrl': 'Paste a SoundCloud playlist or track URL',
        'download.signInRequired': 'Sign in to download',
        'download.validPlaylist': 'Valid playlist URL',
        'download.validTrack': 'Valid track URL',
        'download.fetchingPlaylist': 'Loading playlist...',
        'download.button': 'Download',
        'download.trackCount': `${options?.count ?? 0} tracks`,
        'download.singleTrack': '1 track',
        'errors.trackNotFound': 'Track not found',
        'errors.trackNotFoundHint': 'This track may have been removed or made private',
        'errors.geoBlocked': 'Unavailable in your region',
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

// Mock queueStore
const mockSetTracks = vi.fn();
vi.mock('@/stores/queueStore', () => ({
  useQueueStore: (selector: (state: { setTracks: typeof mockSetTracks }) => unknown) =>
    selector({ setTracks: mockSetTracks }),
}));

// Mock validation
const mockValidateUrl = vi.fn();
vi.mock('@/lib/validation', () => ({
  validateUrl: (url: string) => mockValidateUrl(url),
}));

// Mock playlist fetch
const mockFetchPlaylistInfo = vi.fn();
const mockFetchTrackInfo = vi.fn();
vi.mock('@/lib/playlist', () => ({
  fetchPlaylistInfo: (url: string) => mockFetchPlaylistInfo(url),
  fetchTrackInfo: (url: string) => mockFetchTrackInfo(url),
}));

const mockPlaylistInfo = {
  id: 123,
  title: 'Test Playlist',
  user: { username: 'testuser' },
  artwork_url: 'https://i1.sndcdn.com/artworks-xxx-large.jpg',
  track_count: 2,
  tracks: [
    {
      id: 1,
      title: 'Track 1',
      user: { username: 'artist1' },
      artwork_url: null,
      duration: 180000,
    },
    {
      id: 2,
      title: 'Track 2',
      user: { username: 'artist2' },
      artwork_url: 'https://example.com/art2.jpg',
      duration: 240000,
    },
  ],
};

const mockTrackInfo = {
  id: 456,
  title: 'Test Track',
  user: { username: 'testartist' },
  artwork_url: 'https://i1.sndcdn.com/artworks-track-large.jpg',
  duration: 185000,
};

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
      vi.useRealTimers(); // Use real timers for this test
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'track',
      });
      mockFetchTrackInfo.mockResolvedValue(mockTrackInfo);

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/artist/track-name' } });

      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByText('Valid track URL')).toBeInTheDocument();
      });
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
      vi.useRealTimers(); // Use real timers for this test
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'track',
      });
      mockFetchTrackInfo.mockResolvedValue(mockTrackInfo);

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');

      // First, enter a valid URL
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/artist/track' } });

      await waitFor(() => {
        expect(screen.getByText('Valid track URL')).toBeInTheDocument();
      });

      // Now clear the input
      fireEvent.change(input, { target: { value: '' } });

      // Wait for state to update
      await waitFor(() => {
        expect(screen.queryByText('Valid track URL')).not.toBeInTheDocument();
      });
    });

    it('should debounce validation calls (AC #2 timing)', async () => {
      vi.useRealTimers(); // Use real timers
      mockValidateUrl.mockResolvedValue({
        valid: false,
        error: { code: 'INVALID_URL', message: 'Not a SoundCloud URL' },
      });

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');

      // Type multiple characters quickly
      fireEvent.change(input, { target: { value: 'h' } });
      fireEvent.change(input, { target: { value: 'ht' } });
      fireEvent.change(input, { target: { value: 'htt' } });
      fireEvent.change(input, { target: { value: 'https://example.com' } });

      // Immediately after typing, validation shouldn't have been called yet
      expect(mockValidateUrl).not.toHaveBeenCalled();

      // Wait for debounce (300ms) plus some buffer
      await waitFor(() => {
        expect(mockValidateUrl).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });

      expect(mockValidateUrl).toHaveBeenCalledWith('https://example.com');
    });

    it('should auto-dismiss success border after 2 seconds (AC #2)', async () => {
      vi.useRealTimers(); // Use real timers
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'track',
      });
      mockFetchTrackInfo.mockResolvedValue(mockTrackInfo);

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/artist/track' } });

      // Wait for success border to appear
      await waitFor(() => {
        expect(input).toHaveClass('border-emerald-500');
      });

      // Wait for auto-dismiss (2 seconds + buffer)
      await waitFor(() => {
        expect(input).not.toHaveClass('border-emerald-500');
      }, { timeout: 3000 });
    });
  });

  describe('playlist preview integration (Story 3.4)', () => {
    beforeEach(() => {
      mockAuthStore.mockImplementation((selector) => selector({ isSignedIn: true }));
    });

    it('should show loading state while fetching playlist (AC #1)', async () => {
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'playlist',
      });
      // Never resolve the playlist fetch to keep loading state
      mockFetchPlaylistInfo.mockReturnValue(new Promise(() => {}));

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/artist/sets/playlist' } });

      // Advance past debounce
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(screen.getByTestId('playlist-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading playlist...')).toBeInTheDocument();
    });

    it('should show playlist preview after successful fetch (AC #2)', async () => {
      vi.useRealTimers(); // Use real timers for this test
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'playlist',
      });
      mockFetchPlaylistInfo.mockResolvedValue(mockPlaylistInfo);

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/artist/sets/playlist' } });

      // Wait for playlist preview to appear
      await waitFor(() => {
        expect(screen.getByTestId('playlist-preview')).toBeInTheDocument();
      });

      expect(screen.getByTestId('playlist-title')).toHaveTextContent('Test Playlist');
      expect(screen.getByTestId('playlist-creator')).toHaveTextContent('testuser');
    });

    it('should store tracks in queue store when playlist is fetched (AC #4)', async () => {
      vi.useRealTimers(); // Use real timers for this test
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'playlist',
      });
      mockFetchPlaylistInfo.mockResolvedValue(mockPlaylistInfo);

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/artist/sets/playlist' } });

      // Wait for setTracks to be called
      await waitFor(() => {
        expect(mockSetTracks).toHaveBeenCalled();
      });

      expect(mockSetTracks).toHaveBeenCalledWith([
        {
          id: '1',
          title: 'Track 1',
          artist: 'artist1',
          artworkUrl: null,
          status: 'pending',
        },
        {
          id: '2',
          title: 'Track 2',
          artist: 'artist2',
          artworkUrl: 'https://example.com/art2.jpg',
          status: 'pending',
        },
      ]);
    });

    it('should clear preview when URL changes (AC #5)', async () => {
      vi.useRealTimers(); // Use real timers for this test
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'playlist',
      });
      mockFetchPlaylistInfo.mockResolvedValue(mockPlaylistInfo);

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/artist/sets/playlist' } });

      // Wait for playlist preview to appear
      await waitFor(() => {
        expect(screen.getByTestId('playlist-preview')).toBeInTheDocument();
      });

      // Change URL
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/different' } });

      // Preview should be cleared immediately
      expect(screen.queryByTestId('playlist-preview')).not.toBeInTheDocument();
    });

    it('should not fetch playlist for track URLs but should fetch track info', async () => {
      vi.useRealTimers(); // Use real timers for this test
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'track',
      });
      mockFetchTrackInfo.mockResolvedValue(mockTrackInfo);

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/artist/track' } });

      // Wait for track preview to appear
      await waitFor(() => {
        expect(screen.getByTestId('track-preview')).toBeInTheDocument();
      });

      expect(mockFetchPlaylistInfo).not.toHaveBeenCalled();
      expect(mockFetchTrackInfo).toHaveBeenCalledWith('https://soundcloud.com/artist/track');
      expect(screen.queryByTestId('playlist-preview')).not.toBeInTheDocument();
    });

    it('should hide loading state and not show preview on fetch error', async () => {
      vi.useRealTimers(); // Use real timers for this test
      mockValidateUrl.mockResolvedValue({
        valid: true,
        urlType: 'playlist',
      });
      mockFetchPlaylistInfo.mockRejectedValue(new Error('No token'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/artist/sets/playlist' } });

      // Wait for error handling to complete
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      expect(screen.queryByTestId('playlist-loading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('playlist-preview')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});
