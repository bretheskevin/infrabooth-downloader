import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackRow } from '../TrackRow';
import { TooltipProvider } from '@/components/ui/tooltip';
import { createMockTrackInfo } from '@/test/factories';

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

const noop = () => {};

describe('TrackRow Go+ badge', () => {
  it('shows the Go+ badge when preview_only is true', () => {
    const track = createMockTrackInfo({ preview_only: true });
    render(
      <TooltipProvider>
        <TrackRow track={track} artworkUrl={null} playback={{ onToggle: noop }} />
      </TooltipProvider>,
    );
    expect(screen.getByText('track.goPlusBadge')).toBeInTheDocument();
  });

  it('does not show the Go+ badge when preview_only is false', () => {
    const track = createMockTrackInfo({ preview_only: false });
    render(
      <TooltipProvider>
        <TrackRow track={track} artworkUrl={null} playback={{ onToggle: noop }} />
      </TooltipProvider>,
    );
    expect(screen.queryByText('track.goPlusBadge')).not.toBeInTheDocument();
  });
});
