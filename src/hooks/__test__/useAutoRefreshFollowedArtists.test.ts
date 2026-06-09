import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoRefreshFollowedArtists } from '../useAutoRefreshFollowedArtists';
import { FOLLOWED_ARTISTS_AUTO_REFRESH_MS } from '@/lib/query';
import { createQueryWrapper } from '@/test/queryWrapper';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

vi.mock('@/bindings', () => ({
  commands: {
    getFollowedArtists: vi.fn().mockResolvedValue({ status: 'ok', data: [] }),
  },
}));

describe('useAutoRefreshFollowedArtists', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fire immediately on mount', async () => {
    const { commands } = await import('@/bindings');
    const getFollowedArtistsSpy = vi.mocked(commands.getFollowedArtists);

    renderHook(() => useAutoRefreshFollowedArtists(true), {
      wrapper: createQueryWrapper(),
    });

    expect(getFollowedArtistsSpy).not.toHaveBeenCalled();
  });

  it('fires getFollowedArtists(true) after one interval', async () => {
    const { commands } = await import('@/bindings');
    const getFollowedArtistsSpy = vi.mocked(commands.getFollowedArtists);

    renderHook(() => useAutoRefreshFollowedArtists(true), {
      wrapper: createQueryWrapper(),
    });

    await vi.advanceTimersByTimeAsync(FOLLOWED_ARTISTS_AUTO_REFRESH_MS);
    expect(getFollowedArtistsSpy).toHaveBeenCalledTimes(1);
    expect(getFollowedArtistsSpy).toHaveBeenCalledWith(true);
  });

  it('fires again after a second interval', async () => {
    const { commands } = await import('@/bindings');
    const getFollowedArtistsSpy = vi.mocked(commands.getFollowedArtists);

    renderHook(() => useAutoRefreshFollowedArtists(true), {
      wrapper: createQueryWrapper(),
    });

    await vi.advanceTimersByTimeAsync(FOLLOWED_ARTISTS_AUTO_REFRESH_MS);
    await vi.advanceTimersByTimeAsync(FOLLOWED_ARTISTS_AUTO_REFRESH_MS);
    expect(getFollowedArtistsSpy).toHaveBeenCalledTimes(2);
  });

  it('does not fire when enabled is false', async () => {
    const { commands } = await import('@/bindings');
    const getFollowedArtistsSpy = vi.mocked(commands.getFollowedArtists);

    renderHook(() => useAutoRefreshFollowedArtists(false), {
      wrapper: createQueryWrapper(),
    });

    await vi.advanceTimersByTimeAsync(FOLLOWED_ARTISTS_AUTO_REFRESH_MS);
    expect(getFollowedArtistsSpy).not.toHaveBeenCalled();
  });

  it('cleans up interval on unmount', async () => {
    const { commands } = await import('@/bindings');
    const getFollowedArtistsSpy = vi.mocked(commands.getFollowedArtists);

    const { unmount } = renderHook(() => useAutoRefreshFollowedArtists(true), {
      wrapper: createQueryWrapper(),
    });

    unmount();
    await vi.advanceTimersByTimeAsync(FOLLOWED_ARTISTS_AUTO_REFRESH_MS);
    expect(getFollowedArtistsSpy).not.toHaveBeenCalled();
  });
});
