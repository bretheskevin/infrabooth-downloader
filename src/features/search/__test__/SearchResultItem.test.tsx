import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TrackListProvider, InteractiveTrackRow } from '@/components/InteractiveTrackRow';
import type { TrackInfo } from '@/bindings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/features/player/url-cache', () => ({
  preloadOnHover: vi.fn(),
  preloadImmediate: vi.fn(),
}));

vi.mock('@/features/player/store', () => {
  const { create } = require('zustand');
  const store = create(() => ({
    currentTrack: null,
    state: 'idle',
    pause: vi.fn(),
    resume: vi.fn(),
  }));
  return { usePlayerStore: store };
});

vi.mock('@/hooks/useDownloadState', () => {
  const { create } = require('zustand');
  const store = create(() => ({
    states: new Map(),
    completedCount: 0,
  }));
  return { useDownloadStateStore: store };
});

const mockTrack: TrackInfo = {
  id: 123,
  title: 'Test Track',
  user: { id: 0, username: 'TestArtist', avatar_url: null },
  artwork_url: null,
  duration: 180000,
  permalink_url: 'https://soundcloud.com/test/track',
} as TrackInfo;

const defaultProviderProps = {
  playTrack: vi.fn(),
  downloadTrack: vi.fn(),
  isDownloadEnabled: true,
  downloadVariant: 'filled' as const,
  downloadedIds: new Set<number>(),
};

function renderSearchResult(overrides = {}) {
  const props = { ...defaultProviderProps, ...overrides };
  return render(
    <TooltipProvider>
      <TrackListProvider {...props}>
        <InteractiveTrackRow
          track={mockTrack}
          index={0}
          className="border-b border-border/50 last:border-b-0"
        />
      </TrackListProvider>
    </TooltipProvider>,
  );
}

describe('Search track row (InteractiveTrackRow)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders track info in idle state', () => {
    renderSearchResult();
    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('TestArtist')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });

  it('calls downloadTrack when download button clicked', () => {
    const downloadTrack = vi.fn();
    renderSearchResult({ downloadTrack });
    fireEvent.click(screen.getByRole('button', { name: 'library.detail.download' }));
    expect(downloadTrack).toHaveBeenCalledWith(mockTrack);
  });

  it('shows completed state for downloaded tracks', () => {
    const { container } = renderSearchResult({ downloadedIds: new Set([123]) });
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
  });

  it('hides download button when disabled', () => {
    renderSearchResult({ isDownloadEnabled: false });
    expect(screen.queryByRole('button', { name: 'library.detail.download' })).not.toBeInTheDocument();
  });
});
