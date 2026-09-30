import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackRow } from '../TrackRow';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { TrackInfo } from '@/bindings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/features/player/url-cache', () => ({
  preloadOnHover: vi.fn(),
  preloadImmediate: vi.fn(),
}));

vi.mock('@/features/player/store', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand');
  const store = create(() => ({
    currentTrack: null,
    state: 'idle',
    pause: vi.fn(),
    resume: vi.fn(),
  }));
  return { usePlayerStore: store };
});

vi.mock('@/hooks/useDownloadState', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand');
  const store = create(() => ({
    states: new Map(),
    completedCount: 0,
  }));
  return { useDownloadStateStore: store };
});

vi.mock('@/hooks/useLikeTrack', () => ({
  useLikeTrack: () => undefined,
}));

function makeMockTrack(overrides: Partial<TrackInfo> = {}): TrackInfo {
  return {
    id: 123,
    title: 'Test Track',
    user: { id: 1, username: 'TestArtist', avatar_url: null },
    artwork_url: null,
    duration: 180000,
    permalink_url: 'https://soundcloud.com/test/track',
    waveform_url: null,
    downloadable: false,
    download_url: null,
    secret_token: null,
    preview_only: false,
    ...overrides,
  };
}

const noop = () => {};

describe('TrackRow Go+ badge', () => {
  it('shows the Go+ badge when preview_only is true', () => {
    const track = makeMockTrack({ preview_only: true });
    render(
      <TooltipProvider>
        <TrackRow track={track} artworkUrl={null} playback={{ onToggle: noop }} />
      </TooltipProvider>,
    );
    expect(screen.getByText('track.goPlusBadge')).toBeInTheDocument();
  });

  it('does not show the Go+ badge when preview_only is false', () => {
    const track = makeMockTrack({ preview_only: false });
    render(
      <TooltipProvider>
        <TrackRow track={track} artworkUrl={null} playback={{ onToggle: noop }} />
      </TooltipProvider>,
    );
    expect(screen.queryByText('track.goPlusBadge')).not.toBeInTheDocument();
  });
});
