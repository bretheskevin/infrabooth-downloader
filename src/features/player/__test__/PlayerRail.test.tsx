import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockPlayerState = {
  state: 'playing' as string,
  railTab: 'queue' as 'queue' | 'comments',
  currentTrack: { trackId: 123 } as { trackId: number } | null,
};

vi.mock('../store', () => ({
  usePlayerStore: (selector: (s: typeof mockPlayerState) => unknown) => selector(mockPlayerState),
}));

vi.mock('../components/RailNowPlaying', () => ({
  RailNowPlaying: () => <div data-testid="rail-now-playing">Now Playing</div>,
}));

vi.mock('../components/RailQueue', () => ({
  RailQueue: () => <div data-testid="rail-queue">Queue</div>,
}));

vi.mock('../components/RailTabToggle', () => ({
  RailTabToggle: () => <div data-testid="rail-tab-toggle">Tab Toggle</div>,
}));

vi.mock('@/features/comments', () => ({
  CommentsPanel: ({ trackId, variant }: { trackId?: number; variant: string }) => (
    <div data-testid="comments-panel" data-track-id={trackId} data-variant={variant}>
      Comments
    </div>
  ),
}));

import { PlayerRail } from '../components/PlayerRail';

describe('PlayerRail', () => {
  beforeEach(() => {
    mockPlayerState.state = 'playing';
    mockPlayerState.railTab = 'queue';
    mockPlayerState.currentTrack = { trackId: 123 };
  });

  it('renders RailNowPlaying, RailTabToggle, and RailQueue when playing with queue tab', () => {
    render(<PlayerRail />);
    expect(screen.getByTestId('rail-now-playing')).toBeInTheDocument();
    expect(screen.getByTestId('rail-tab-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('rail-queue')).toBeInTheDocument();
  });

  it('renders nothing when state is stopped', () => {
    mockPlayerState.state = 'stopped';
    const { container } = render(<PlayerRail />);
    expect(container.firstChild).toBeNull();
  });

  it('renders as an aside element', () => {
    const { container } = render(<PlayerRail />);
    expect(container.querySelector('aside')).toBeInTheDocument();
  });

  it('renders when state is paused', () => {
    mockPlayerState.state = 'paused';
    render(<PlayerRail />);
    expect(screen.getByTestId('rail-now-playing')).toBeInTheDocument();
    expect(screen.getByTestId('rail-queue')).toBeInTheDocument();
  });

  it('renders CommentsPanel instead of RailQueue when railTab is comments', () => {
    mockPlayerState.railTab = 'comments';
    render(<PlayerRail />);
    expect(screen.getByTestId('comments-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('rail-queue')).not.toBeInTheDocument();
  });

  it('passes currentTrack.trackId and rail variant to CommentsPanel', () => {
    mockPlayerState.railTab = 'comments';
    render(<PlayerRail />);
    const panel = screen.getByTestId('comments-panel');
    expect(panel).toHaveAttribute('data-track-id', '123');
    expect(panel).toHaveAttribute('data-variant', 'rail');
  });

  it('passes undefined trackId to CommentsPanel when no current track', () => {
    mockPlayerState.railTab = 'comments';
    mockPlayerState.currentTrack = null;
    render(<PlayerRail />);
    const panel = screen.getByTestId('comments-panel');
    expect(panel).not.toHaveAttribute('data-track-id');
  });
});
