import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationRow } from '../components/NotificationRow';
import type { NotificationItem } from '@/bindings';
import { createQueryWrapper } from '@/test/queryWrapper';

vi.mock('@/features/artist-profile', () => ({
  useArtistProfileStore: {
    getState: vi.fn(() => ({ openProfile: vi.fn() })),
  },
}));

vi.mock('@/features/player', () => ({
  usePlayerStore: {
    getState: vi.fn(() => ({ play: vi.fn() })),
  },
  buildPlaybackQueue: vi.fn((tracks: { id: number; title: string }[]) =>
    tracks.map((t) => ({ trackId: t.id, title: t.title })),
  ),
}));

vi.mock('../store', () => ({
  useNotificationsStore: {
    getState: vi.fn(() => ({
      openPlaylist: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/date', () => ({
  formatRelativeTime: vi.fn(() => '2h ago'),
}));

const baseActor = {
  id: 1,
  username: 'TestUser',
  avatar_url: 'https://example.com/avatar.jpg',
  permalink_url: 'https://soundcloud.com/testuser',
};

const baseTrack = {
  id: 100,
  title: 'My Track',
  user: { id: 2, username: 'Artist', avatar_url: null },
  artwork_url: 'https://example.com/art.jpg',
  duration: 180000,
  permalink_url: 'https://soundcloud.com/artist/my-track',
  waveform_url: null,
  downloadable: false,
  download_url: null,
};

const basePlaylist = {
  id: 200,
  title: 'My Playlist',
  artwork_url: 'https://example.com/playlist-art.jpg',
  permalink_url: 'https://soundcloud.com/artist/sets/my-playlist',
  track_count: 10,
  user: { id: 2, username: 'Artist', avatar_url: null },
};

const onClose = vi.fn();

describe('NotificationRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders affiliation item', () => {
    const item: NotificationItem = {
      kind: 'affiliation',
      id: 'uuid-1',
      created_at: '2026-04-12T02:00:00Z',
      actor: baseActor,
    };
    render(<NotificationRow item={item} onClose={onClose} />, { wrapper: createQueryWrapper() });
    expect(screen.getByText(/notifications\.label\.affiliation/)).toBeTruthy();
    expect(screen.getByText('2h ago')).toBeTruthy();
  });

  it('renders track_like item with artwork', () => {
    const item: NotificationItem = {
      kind: 'track_like',
      id: 'uuid-2',
      created_at: '2026-04-12T02:00:00Z',
      actor: baseActor,
      track: baseTrack,
    };
    render(<NotificationRow item={item} onClose={onClose} />, { wrapper: createQueryWrapper() });
    expect(screen.getByText(/notifications\.label\.track_like/)).toBeTruthy();
    const images = document.querySelectorAll('img');
    expect(images.length).toBeGreaterThanOrEqual(2);
  });

  it('renders comment item with body', () => {
    const item: NotificationItem = {
      kind: 'comment',
      id: 'uuid-3',
      created_at: '2026-04-12T02:00:00Z',
      actor: baseActor,
      track: baseTrack,
      body: 'Great track!',
    };
    render(<NotificationRow item={item} onClose={onClose} />, { wrapper: createQueryWrapper() });
    expect(screen.getByText(/Great track!/)).toBeTruthy();
  });

  it('renders playlist_like item', () => {
    const item: NotificationItem = {
      kind: 'playlist_like',
      id: 'uuid-4',
      created_at: '2026-04-12T02:00:00Z',
      actor: baseActor,
      playlist: basePlaylist,
    };
    render(<NotificationRow item={item} onClose={onClose} />, { wrapper: createQueryWrapper() });
    expect(screen.getByText(/notifications\.label\.playlist_like/)).toBeTruthy();
  });

  it('calls onClose when affiliation row is clicked', async () => {
    const item: NotificationItem = {
      kind: 'affiliation',
      id: 'uuid-5',
      created_at: '2026-04-12T02:00:00Z',
      actor: baseActor,
    };
    render(<NotificationRow item={item} onClose={onClose} />, { wrapper: createQueryWrapper() });
    await userEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
