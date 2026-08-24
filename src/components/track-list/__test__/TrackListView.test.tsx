import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { TrackInfo } from '@/bindings';
import { TranslationProvider } from '@/lib/translation';
import { TrackListView } from '../TrackListView';

function Wrapper({ children }: { children: ReactNode }) {
  return <TranslationProvider t={(key) => key}>{children}</TranslationProvider>;
}

const mockPlayTrack = vi.fn();
const mockSyncQueue = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.downloadAll': 'Download all',
        'common.filterPlaceholder': 'Filter tracks...',
        'common.noResults': 'No results',
        'common.error': 'Something went wrong',
        'common.retry': 'Retry',
        'test.empty': 'No tracks',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('@/features/settings/hooks/useIsDownloadEnabled', () => ({
  useIsDownloadEnabled: () => true,
}));

vi.mock('@/hooks/useSearchFilter', () => ({
  useSearchFilter: (tracks: TrackInfo[]) => ({
    searchQuery: '',
    setSearchQuery: vi.fn(),
    filteredTracks: tracks,
  }),
}));

vi.mock('@/hooks/useTrackDownloadState', () => ({
  useTrackDownloadState: () => ({
    downloadTrack: vi.fn(),
    downloadedIds: new Set<number>(),
    downloadedCount: 0,
  }),
}));

vi.mock('@/hooks/useTrackSelection', () => ({
  useTrackSelection: () => ({
    selectedIds: new Set<number>(),
    toggleTrack: vi.fn(),
    toggleAll: vi.fn(),
    clearSelection: vi.fn(),
    selectedCount: 0,
    isAllSelected: false,
    selectedTracks: [],
    selectableCount: 0,
  }),
}));

vi.mock('@/features/player/hooks/usePlayContext', () => ({
  usePlayContext: () => ({
    playTrack: mockPlayTrack,
    syncQueue: mockSyncQueue,
  }),
}));

const mockPlayerStoreGetState = vi.fn(() => ({
  isShuffled: false,
  toggleShuffle: vi.fn(),
}));

vi.mock('@/features/player/store', () => ({
  usePlayerStore: Object.assign(() => undefined, {
    getState: () => mockPlayerStoreGetState(),
  }),
}));

vi.mock('@/hooks/useDownloadSelected', () => ({
  useDownloadSelected: () => vi.fn(),
}));

vi.mock('@/features/settings', () => ({
  useIsDownloadEnabled: () => true,
}));

vi.mock('@/hooks/useFolderPath', () => ({
  useFolderPath: () => ({
    effectivePath: '/default/path',
    folderName: 'path',
    isCustomFolder: false,
    selectFolder: vi.fn(),
    resetLocalPath: vi.fn(),
  }),
}));

vi.mock('@/hooks/useOpenDownloadFolder', () => ({
  useOpenDownloadFolder: () => vi.fn(),
}));

vi.mock('@/features/rekordbox-export/hooks/useRekordboxDetection', () => ({
  useRekordboxDetection: () => ({ data: { found: true } }),
}));

vi.mock('@/components/PreserveOrderToggle', () => ({
  PreserveOrderToggle: () => <div data-testid="preserve-order-toggle" />,
}));

const toolbarSortRef: {
  current: import('@/components/track-list/types').SortConfig<import('@/lib/sort').SortField> | null;
} = { current: null };
vi.mock('../TrackListToolbar', () => ({
  TrackListToolbar: (props: { sort: import('@/components/track-list/types').SortConfig<import('@/lib/sort').SortField> }) => {
    toolbarSortRef.current = props.sort;
    return <div data-testid="toolbar" />;
  },
}));

const itemsTracksRef: { current: TrackInfo[] | null } = { current: null };
vi.mock('../TrackListItems', () => ({
  TrackListItems: ({ tracks }: { tracks: TrackInfo[] }) => {
    itemsTracksRef.current = tracks;
    return <div data-testid="items" />;
  },
}));

const createTrack = (id: number) =>
  ({
    id,
    title: `Track ${id}`,
    user: { id: 0, username: 'Artist', avatar_url: null },
    duration: 180000,
    artwork_url: null,
    permalink_url: `https://soundcloud.com/artist/track-${id}`,
  }) as TrackInfo;

describe('TrackListView', () => {
  const defaultProps = {
    query: {
      tracks: undefined as TrackInfo[] | undefined,
      isLoading: false,
      error: null as Error | null,
    },
    source: { title: 'Test' },
    header: <div data-testid="header">Header</div>,
    download: { path: '/dl', onDownloadTracks: vi.fn() },
    messages: { empty: 'test.empty' },
  };

  it('renders loading state when isLoading', () => {
    const { container } = render(<TrackListView {...defaultProps} query={{ ...defaultProps.query, isLoading: true }} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders empty state when tracks is empty array', () => {
    render(<TrackListView {...defaultProps} query={{ ...defaultProps.query, tracks: [] }} />);
    expect(screen.getByText('No tracks')).toBeInTheDocument();
  });

  it('renders error state when error present and onRetry provided', () => {
    const onRetry = vi.fn();
    render(
      <TrackListView
        {...defaultProps}
        query={{ ...defaultProps.query, error: new Error('fail'), onRetry }}
        messages={{ empty: 'test.empty', error: 'common.error' }}
      />,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders header always', () => {
    render(<TrackListView {...defaultProps} />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('calls header render function with context', () => {
    const headerFn = vi.fn(() => <div data-testid="fn-header">FN</div>);
    render(<TrackListView {...defaultProps} query={{ ...defaultProps.query, tracks: [createTrack(1)] }} header={headerFn} />);
    expect(headerFn).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.anything(),
        folderMetadata: expect.anything(),
      }),
    );
    expect(screen.getByTestId('fn-header')).toBeInTheDocument();
  });

  it('passes tracks in original order with default sort', () => {
    const t1 = { ...createTrack(1), title: 'Zebra' };
    const t2 = { ...createTrack(2), title: 'Alpha' };
    render(<TrackListView {...defaultProps} query={{ ...defaultProps.query, tracks: [t1, t2] }} />);
    expect(itemsTracksRef.current?.map((t) => t.title)).toEqual(['Zebra', 'Alpha']);
  });

  it('sorts tracks by title when sort field changes', () => {
    const t1 = { ...createTrack(1), title: 'Zebra' };
    const t2 = { ...createTrack(2), title: 'Alpha' };
    render(<TrackListView {...defaultProps} query={{ ...defaultProps.query, tracks: [t1, t2] }} />);
    act(() => toolbarSortRef.current?.onChange('title'));
    expect(itemsTracksRef.current?.map((t) => t.title)).toEqual(['Alpha', 'Zebra']);
  });

  it('resets sort state when resetKey changes', () => {
    const t1 = { ...createTrack(1), title: 'Zebra' };
    const t2 = { ...createTrack(2), title: 'Alpha' };
    const tracksQuery = { ...defaultProps.query, tracks: [t1, t2] };
    const { rerender } = render(<TrackListView {...defaultProps} query={tracksQuery} resetKey="a" />);
    act(() => toolbarSortRef.current?.onChange('title'));
    expect(toolbarSortRef.current?.active).toBe('title');

    rerender(<TrackListView {...defaultProps} query={tracksQuery} resetKey="b" />);
    expect(toolbarSortRef.current?.active).toBe('default');
    expect(itemsTracksRef.current?.map((t) => t.title)).toEqual(['Zebra', 'Alpha']);
  });

  it('renders filter chips when filters config is provided and not loading', () => {
    const onChange = vi.fn();
    render(
      <TrackListView
        {...defaultProps}
        query={{ ...defaultProps.query, tracks: [createTrack(1)] }}
        filters={{
          options: [
            { key: 'all', label: 'All' },
            { key: 'new', label: 'New' },
          ],
          active: 'all',
          onChange,
        }}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('does not render filters when loading', () => {
    render(
      <TrackListView
        {...defaultProps}
        query={{ ...defaultProps.query, isLoading: true }}
        filters={{
          options: [{ key: 'all', label: 'All' }],
          active: 'all',
          onChange: vi.fn(),
        }}
      />,
    );
    expect(screen.queryByText('All')).not.toBeInTheDocument();
  });

  it('renders streaming indicator when streaming and has tracks', () => {
    render(<TrackListView {...defaultProps} query={{ ...defaultProps.query, tracks: [createTrack(1)], isStreaming: true }} />);
    expect(screen.getByText('common.loadingTracks')).toBeInTheDocument();
  });

  it('does not render streaming indicator when not streaming', () => {
    render(<TrackListView {...defaultProps} query={{ ...defaultProps.query, tracks: [createTrack(1)], isStreaming: false }} />);
    expect(screen.queryByText('common.loadingTracks')).not.toBeInTheDocument();
  });

  it('onPlayAll disables shuffle if currently active', () => {
    const toggleShuffle = vi.fn();
    mockPlayerStoreGetState.mockReturnValue({
      isShuffled: true,
      toggleShuffle,
    });

    const headerFn = vi.fn((_ctx) => <div data-testid="fn-header">FN</div>);
    render(
      <TrackListView {...defaultProps} query={{ ...defaultProps.query, tracks: [createTrack(1), createTrack(2)] }} header={headerFn} />,
    );

    const ctx = headerFn.mock.calls[headerFn.mock.calls.length - 1]![0];
    expect(ctx.onPlayAll).toBeDefined();
    act(() => ctx.onPlayAll!());
    expect(toggleShuffle).toHaveBeenCalled();
  });

  it('onPlayAll does not call toggleShuffle when shuffle is inactive', () => {
    const toggleShuffle = vi.fn();
    mockPlayerStoreGetState.mockReturnValue({
      isShuffled: false,
      toggleShuffle,
    });

    const headerFn = vi.fn((_ctx) => <div data-testid="fn-header">FN</div>);
    render(
      <TrackListView {...defaultProps} query={{ ...defaultProps.query, tracks: [createTrack(1), createTrack(2)] }} header={headerFn} />,
    );

    const ctx = headerFn.mock.calls[headerFn.mock.calls.length - 1]![0];
    act(() => ctx.onPlayAll!());
    expect(toggleShuffle).not.toHaveBeenCalled();
  });
});
