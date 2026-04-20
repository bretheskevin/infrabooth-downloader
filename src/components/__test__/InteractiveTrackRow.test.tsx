import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TrackListProvider, InteractiveTrackRow } from '../InteractiveTrackRow';
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

const mockTrack: TrackInfo = {
  id: 123,
  title: 'Test Track',
  user: { id: 0, username: 'TestArtist', avatar_url: null },
  artwork_url: null,
  duration: 180000,
  permalink_url: 'https://soundcloud.com/test/track',
  download_url: null,
} as TrackInfo;

const defaultProviderProps = {
  playTrack: vi.fn(),
  downloadTrack: vi.fn(),
  isDownloadEnabled: true,
  downloadedIds: new Set<number>(),
};

type ProviderProps = typeof defaultProviderProps & {
  downloadVariant?: 'ghost' | 'filled';
  selection?: { selectedIds: Set<number>; toggleTrack: (id: number) => void };
  animate?: boolean;
};

function renderWithProvider(
  ui: React.ReactElement,
  providerProps: ProviderProps = defaultProviderProps,
) {
  return render(
    <TooltipProvider>
      <TrackListProvider {...providerProps}>{ui}</TrackListProvider>
    </TooltipProvider>,
  );
}

describe('InteractiveTrackRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders track info', () => {
    renderWithProvider(<InteractiveTrackRow track={mockTrack} index={0} />);
    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('TestArtist')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });

  it('renders download button when download enabled', () => {
    renderWithProvider(<InteractiveTrackRow track={mockTrack} index={0} />);
    expect(screen.getByRole('button', { name: 'library.detail.download' })).toBeInTheDocument();
  });

  it('hides download button when download disabled', () => {
    renderWithProvider(<InteractiveTrackRow track={mockTrack} index={0} />, {
      ...defaultProviderProps,
      isDownloadEnabled: false,
    });
    expect(screen.queryByRole('button', { name: 'library.detail.download' })).not.toBeInTheDocument();
  });

  it('calls downloadTrack on download click', () => {
    const downloadTrack = vi.fn();
    renderWithProvider(<InteractiveTrackRow track={mockTrack} index={0} />, {
      ...defaultProviderProps,
      downloadTrack,
    });
    fireEvent.click(screen.getByRole('button', { name: 'library.detail.download' }));
    expect(downloadTrack).toHaveBeenCalledWith(mockTrack);
  });

  it('renders checkbox when selection provided', () => {
    renderWithProvider(<InteractiveTrackRow track={mockTrack} index={0} />, {
      ...defaultProviderProps,
      selection: { selectedIds: new Set<number>(), toggleTrack: vi.fn() },
    });
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('does not render checkbox without selection', () => {
    renderWithProvider(<InteractiveTrackRow track={mockTrack} index={0} />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows track index number', () => {
    renderWithProvider(<InteractiveTrackRow track={mockTrack} index={4} />, {
      ...defaultProviderProps,
      selection: { selectedIds: new Set<number>(), toggleTrack: vi.fn() },
    });
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls toggleTrack on checkbox click', () => {
    const toggleTrack = vi.fn();
    renderWithProvider(<InteractiveTrackRow track={mockTrack} index={0} />, {
      ...defaultProviderProps,
      selection: { selectedIds: new Set<number>(), toggleTrack },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(toggleTrack).toHaveBeenCalledWith(123);
  });

  it('marks checkbox as checked when selected', () => {
    renderWithProvider(<InteractiveTrackRow track={mockTrack} index={0} />, {
      ...defaultProviderProps,
      selection: { selectedIds: new Set([123]), toggleTrack: vi.fn() },
    });
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'checked');
  });

  it('disables checkbox for downloaded tracks', () => {
    renderWithProvider(<InteractiveTrackRow track={mockTrack} index={0} />, {
      ...defaultProviderProps,
      downloadedIds: new Set([123]),
      selection: { selectedIds: new Set<number>(), toggleTrack: vi.fn() },
    });
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('shows completed state for filesystem-downloaded tracks', () => {
    const { container } = renderWithProvider(
      <InteractiveTrackRow track={mockTrack} index={0} />,
      { ...defaultProviderProps, downloadedIds: new Set([123]) },
    );
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
  });

  it('renders subtitleSlot when provided', () => {
    renderWithProvider(
      <InteractiveTrackRow
        track={mockTrack}
        index={0}
        subtitleSlot={<span data-testid="badge">Repost</span>}
      />,
    );
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });
});
