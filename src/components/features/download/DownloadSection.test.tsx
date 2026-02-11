import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DownloadSection } from './DownloadSection';
import type { PlaylistInfo, TrackInfo } from '@/types/playlist';
import type { ValidationResult } from '@/types/url';
import type { FetchError } from '@/hooks/download';

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
        'download.startingDownload': 'Starting download...',
        'download.preparingTracks': 'Preparing your tracks for download',
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
const mockQueueStore = vi.fn();
vi.mock('@/stores/queueStore', () => ({
  useQueueStore: (selector: (state: { isProcessing: boolean; isRateLimited: boolean }) => unknown) => mockQueueStore(selector),
}));

// Mock useDownloadFlow hook
interface MockDownloadFlowReturn {
  url: string;
  setUrl: (url: string) => void;
  validation: ValidationResult | null;
  isValidating: boolean;
  media: PlaylistInfo | TrackInfo | null;
  isLoading: boolean;
  error: FetchError | null;
  handleDownload: () => void;
}

const mockSetUrl = vi.fn();
const mockHandleDownload = vi.fn();

const defaultMockReturn: MockDownloadFlowReturn = {
  url: '',
  setUrl: mockSetUrl,
  validation: null,
  isValidating: false,
  media: null,
  isLoading: false,
  error: null,
  handleDownload: mockHandleDownload,
};

let mockDownloadFlowReturn = { ...defaultMockReturn };

const mockResetQueue = vi.fn();
const mockDownloadCompletionReturn = {
  isComplete: false,
  completedCount: 0,
  failedCount: 0,
  totalCount: 0,
  resetQueue: mockResetQueue,
  hasFailures: false,
  isFullSuccess: false,
};

vi.mock('@/hooks/download', () => ({
  useDownloadFlow: () => mockDownloadFlowReturn,
  useDownloadProgress: () => {},
  useDownloadCompletion: () => mockDownloadCompletionReturn,
}));

const mockPlaylistInfo: PlaylistInfo = {
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

const mockTrackInfo: TrackInfo = {
  id: 456,
  title: 'Test Track',
  user: { username: 'testartist' },
  artwork_url: 'https://i1.sndcdn.com/artworks-track-large.jpg',
  duration: 185000,
};

describe('DownloadSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDownloadFlowReturn = { ...defaultMockReturn, setUrl: mockSetUrl, handleDownload: mockHandleDownload };
    // Default queue state: not processing, not rate limited
    mockQueueStore.mockImplementation((selector) => selector({ isProcessing: false, isRateLimited: false }));
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

    it('should call setUrl when input changes', () => {
      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      fireEvent.change(input, { target: { value: 'https://soundcloud.com/test' } });

      expect(mockSetUrl).toHaveBeenCalledWith('https://soundcloud.com/test');
    });
  });

  describe('when user is not signed in', () => {
    beforeEach(() => {
      mockAuthStore.mockImplementation((selector) => selector({ isSignedIn: false }));
    });

    it('should render URL input', () => {
      render(<DownloadSection />);

      expect(screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL')).toBeInTheDocument();
    });
  });

  describe('validation feedback', () => {
    beforeEach(() => {
      mockAuthStore.mockImplementation((selector) => selector({ isSignedIn: true }));
    });

    it('should show success feedback for valid URL', () => {
      mockDownloadFlowReturn = {
        ...defaultMockReturn,
        validation: { valid: true, urlType: 'track' },
      };

      render(<DownloadSection />);

      expect(screen.getByText('Valid track URL')).toBeInTheDocument();
    });

    it('should show error feedback for invalid URL', () => {
      mockDownloadFlowReturn = {
        ...defaultMockReturn,
        validation: {
          valid: false,
          error: {
            code: 'INVALID_URL',
            message: 'Not a SoundCloud URL',
            hint: 'Paste a link from soundcloud.com',
          },
        },
      };

      render(<DownloadSection />);

      expect(screen.getByText('Not a SoundCloud URL')).toBeInTheDocument();
      expect(screen.getByText('Paste a link from soundcloud.com')).toBeInTheDocument();
    });

    it('should show fetch error in validation feedback', () => {
      mockDownloadFlowReturn = {
        ...defaultMockReturn,
        validation: { valid: true, urlType: 'track' },
        error: {
          code: 'FETCH_FAILED',
          message: 'Track not found',
          hint: 'This track may have been removed or made private',
        },
      };

      render(<DownloadSection />);

      expect(screen.getByText('Track not found')).toBeInTheDocument();
      expect(screen.getByText('This track may have been removed or made private')).toBeInTheDocument();
    });

    it('should show validating spinner when isValidating is true', () => {
      mockDownloadFlowReturn = {
        ...defaultMockReturn,
        isValidating: true,
      };

      render(<DownloadSection />);

      // The UrlInput shows a spinner when validating
      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      expect(input.parentElement?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('playlist preview', () => {
    beforeEach(() => {
      mockAuthStore.mockImplementation((selector) => selector({ isSignedIn: true }));
    });

    it('should show loading state while fetching', () => {
      mockDownloadFlowReturn = {
        ...defaultMockReturn,
        validation: { valid: true, urlType: 'playlist' },
        isLoading: true,
      };

      render(<DownloadSection />);

      expect(screen.getByTestId('playlist-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading playlist...')).toBeInTheDocument();
    });

    it('should show playlist preview when media is playlist', () => {
      mockDownloadFlowReturn = {
        ...defaultMockReturn,
        validation: { valid: true, urlType: 'playlist' },
        media: mockPlaylistInfo,
      };

      render(<DownloadSection />);

      expect(screen.getByTestId('playlist-preview')).toBeInTheDocument();
      expect(screen.getByTestId('playlist-title')).toHaveTextContent('Test Playlist');
      expect(screen.getByTestId('playlist-creator')).toHaveTextContent('testuser');
    });

    it('should not show playlist preview while loading', () => {
      mockDownloadFlowReturn = {
        ...defaultMockReturn,
        validation: { valid: true, urlType: 'playlist' },
        media: mockPlaylistInfo,
        isLoading: true,
      };

      render(<DownloadSection />);

      expect(screen.queryByTestId('playlist-preview')).not.toBeInTheDocument();
    });
  });

  describe('track preview', () => {
    beforeEach(() => {
      mockAuthStore.mockImplementation((selector) => selector({ isSignedIn: true }));
    });

    it('should show track preview when media is track', () => {
      mockDownloadFlowReturn = {
        ...defaultMockReturn,
        validation: { valid: true, urlType: 'track' },
        media: mockTrackInfo,
      };

      render(<DownloadSection />);

      expect(screen.getByTestId('track-preview')).toBeInTheDocument();
    });

    it('should not show track preview while loading', () => {
      mockDownloadFlowReturn = {
        ...defaultMockReturn,
        validation: { valid: true, urlType: 'track' },
        media: mockTrackInfo,
        isLoading: true,
      };

      render(<DownloadSection />);

      expect(screen.queryByTestId('track-preview')).not.toBeInTheDocument();
    });
  });

  describe('success border auto-dismiss', () => {
    beforeEach(() => {
      mockAuthStore.mockImplementation((selector) => selector({ isSignedIn: true }));
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show success border initially for valid validation', () => {
      mockDownloadFlowReturn = {
        ...defaultMockReturn,
        validation: { valid: true, urlType: 'track' },
      };

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      expect(input).toHaveClass('border-success');
    });

    it('should hide success border after 2 seconds', async () => {
      mockDownloadFlowReturn = {
        ...defaultMockReturn,
        validation: { valid: true, urlType: 'track' },
      };

      render(<DownloadSection />);

      const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
      expect(input).toHaveClass('border-success');

      // Advance time by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(input).not.toHaveClass('border-success');
    });
  });

  describe('download action', () => {
    beforeEach(() => {
      mockAuthStore.mockImplementation((selector) => selector({ isSignedIn: true }));
    });

    it('should call handleDownload when download button is clicked', () => {
      mockDownloadFlowReturn = {
        ...defaultMockReturn,
        setUrl: mockSetUrl,
        handleDownload: mockHandleDownload,
        validation: { valid: true, urlType: 'playlist' },
        media: mockPlaylistInfo,
      };

      render(<DownloadSection />);

      const downloadButton = screen.getByText('Download');
      fireEvent.click(downloadButton);

      expect(mockHandleDownload).toHaveBeenCalled();
    });
  });
});
