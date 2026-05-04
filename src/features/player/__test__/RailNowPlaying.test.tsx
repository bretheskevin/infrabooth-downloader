import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../store', () => {
  const store = Object.assign(vi.fn(), {
    getState: vi.fn(() => ({
      currentTrack: null,
      state: 'stopped',
      toggleExpanded: vi.fn(),
    })),
  });
  return { usePlayerStore: store };
});

vi.mock('@/hooks/useLikeTrack', () => ({
  useLikeTrack: vi.fn(() => undefined),
}));

vi.mock('@/hooks/useDownloadState', () => ({
  useDownloadStateStore: vi.fn(() => undefined),
}));

vi.mock('@/hooks/useOpenDownloadFolder', () => ({
  useOpenDownloadFolder: vi.fn(() => vi.fn()),
}));

vi.mock('@/components/TrackActionsDropdown', () => ({
  TrackActionsDropdown: () => <div data-testid="track-actions" />,
}));

vi.mock('../components/ScrollingText', () => ({
  ScrollingText: ({ text }: { text: string }) => <span data-testid="scrolling-text">{text}</span>,
}));

vi.mock('../components/SeekBar', () => ({
  SeekBar: () => <div data-testid="seek-bar" />,
}));

vi.mock('../components/TransportControls', () => ({
  TransportControls: ({ className }: { className?: string }) => <div data-testid="transport-controls" className={className} />,
}));

vi.mock('../components/VolumeControl', () => ({
  VolumeControl: ({ className }: { className?: string }) => <div data-testid="volume-control" className={className} />,
}));

vi.mock('@/components/ArtistLink', () => ({
  ArtistLink: ({ username }: { username: string }) => <span data-testid="artist-link">{username}</span>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('zustand/react/shallow', () => ({
  useShallow: (fn: unknown) => fn,
}));

import { usePlayerStore } from '../store';
import { RailNowPlaying } from '../components/RailNowPlaying';

const mockTrack = {
  trackId: 123,
  title: 'Test Track',
  artist: 'Test Artist',
  artistId: 456,
  artworkUrl: 'https://example.com/art-large.jpg',
  trackUrl: 'https://soundcloud.com/test/track',
  waveformUrl: 'https://example.com/waveform.json',
  durationMs: 180000,
};

function setupStore(overrides: Record<string, unknown> = {}) {
  const defaults = {
    state: 'playing',
    currentTrack: mockTrack,
    positionMs: 30000,
    durationMs: 180000,
    volume: 0.75,
    ...overrides,
  };
  (usePlayerStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (s: typeof defaults) => unknown) =>
    selector(defaults),
  );
}

describe('RailNowPlaying', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no current track', () => {
    setupStore({ currentTrack: null, state: 'stopped' });
    const { container } = render(<RailNowPlaying />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the now playing header', () => {
    setupStore();
    render(<RailNowPlaying />);
    expect(screen.getByText('player.nowPlaying')).toBeInTheDocument();
  });

  it('renders cover art with large artwork URL', () => {
    setupStore();
    const { container } = render(<RailNowPlaying />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('t500x500'));
  });

  it('renders track title via ScrollingText', () => {
    setupStore();
    render(<RailNowPlaying />);
    expect(screen.getByTestId('scrolling-text')).toHaveTextContent('Test Track');
  });

  it('renders artist link', () => {
    setupStore();
    render(<RailNowPlaying />);
    expect(screen.getByTestId('artist-link')).toHaveTextContent('Test Artist');
  });

  it('renders seek bar', () => {
    setupStore();
    render(<RailNowPlaying />);
    expect(screen.getByTestId('seek-bar')).toBeInTheDocument();
  });

  it('renders time display', () => {
    setupStore({ positionMs: 30000, durationMs: 180000 });
    render(<RailNowPlaying />);
    expect(screen.getByText('0:30')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });

  it('renders transport buttons centered with play/pause', () => {
    setupStore();
    render(<RailNowPlaying />);
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('renders volume button', () => {
    setupStore({ volume: 0.75 });
    render(<RailNowPlaying />);
    expect(screen.getByRole('button', { name: /volume/i })).toBeInTheDocument();
  });

  it('renders track actions dropdown', () => {
    setupStore();
    render(<RailNowPlaying />);
    expect(screen.getByTestId('track-actions')).toBeInTheDocument();
  });
});
