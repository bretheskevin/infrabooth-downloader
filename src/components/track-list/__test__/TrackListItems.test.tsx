import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackListItems } from '../TrackListItems';
import type { TrackInfo } from '@/bindings';

vi.mock('@/hooks/useVirtualizedList', () => ({
  useVirtualizedList: ({ count }: { count: number }) => ({
    parentRef: { current: null },
    virtualItems: Array.from({ length: count }, (_, i) => ({
      index: i,
      size: 56,
      start: i * 56,
    })),
    totalSize: count * 56,
    getScrollOffset: () => 0,
  }),
}));

vi.mock('@/components/ui/virtual-list', () => ({
  VirtualListContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="virtual-list">{children}</div>,
  VirtualRow: ({ children }: { children: React.ReactNode }) => <div data-testid="virtual-row">{children}</div>,
}));

vi.mock('@/components/InteractiveTrackRow', () => ({
  InteractiveTrackRow: ({ track, subtitleSlot }: { track: TrackInfo; subtitleSlot?: React.ReactNode }) => (
    <div data-testid={`track-${track.id}`}>
      {track.title}
      {subtitleSlot && <span data-testid="subtitle">{subtitleSlot}</span>}
    </div>
  ),
}));

const createTrack = (id: number) => ({ id, title: `Track ${id}` }) as TrackInfo;

const tracks = [createTrack(1), createTrack(2), createTrack(3)];

describe('TrackListItems', () => {
  it('renders virtualized list when virtualized is true', () => {
    render(<TrackListItems tracks={tracks} virtualized itemHeight={56} />);
    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('virtual-row')).toHaveLength(3);
  });

  it('renders flat list when virtualized is false', () => {
    render(<TrackListItems tracks={tracks} virtualized={false} itemHeight={56} />);
    expect(screen.queryByTestId('virtual-list')).not.toBeInTheDocument();
    expect(screen.getByText('Track 1')).toBeInTheDocument();
    expect(screen.getByText('Track 3')).toBeInTheDocument();
  });

  it('passes subtitleSlot to each track row', () => {
    render(
      <TrackListItems tracks={tracks} virtualized={false} itemHeight={56} subtitleSlot={(track) => <span>{`sub-${track.id}`}</span>} />,
    );
    expect(screen.getAllByTestId('subtitle')).toHaveLength(3);
  });

  it('calls onScrollOffsetChange cleanup on unmount for virtualized list', () => {
    const onScrollOffsetChange = vi.fn();
    const { unmount } = render(<TrackListItems tracks={tracks} virtualized itemHeight={56} onScrollOffsetChange={onScrollOffsetChange} />);
    unmount();
    expect(onScrollOffsetChange).toHaveBeenCalledWith(0);
  });
});
