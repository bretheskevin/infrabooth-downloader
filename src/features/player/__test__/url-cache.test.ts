import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/tauri', () => ({
  api: {
    resolvePlaybackUrl: vi.fn(),
  },
}));

vi.mock('@/bindings', () => ({
  commands: {
    playerPreloadSegments: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
    playerPurgeCache: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
  },
}));

import { getCachedUrl, setCachedUrl, preloadQueueSegments, purgeStaleCache } from '../url-cache';
import { api } from '@/lib/tauri';
import { commands } from '@/bindings';
import { flushPlayerCommands } from '../player-commands';

describe('url-cache segment preloading', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setCachedUrl(1, 'http://old');
    setCachedUrl(2, 'http://old');
    setCachedUrl(3, 'http://old');
    purgeStaleCache(new Set());
    await flushPlayerCommands();
    vi.clearAllMocks();
  });

  describe('purgeStaleCache', () => {
    it('should remove cache entries not in the provided set', () => {
      setCachedUrl(1, 'http://a');
      setCachedUrl(2, 'http://b');
      setCachedUrl(3, 'http://c');

      purgeStaleCache(new Set([2]));

      expect(getCachedUrl(1)).toBeNull();
      expect(getCachedUrl(2)).toBe('http://b');
      expect(getCachedUrl(3)).toBeNull();
    });

    it('should clear all entries when given empty set', () => {
      setCachedUrl(1, 'http://a');
      setCachedUrl(2, 'http://b');

      purgeStaleCache(new Set());

      expect(getCachedUrl(1)).toBeNull();
      expect(getCachedUrl(2)).toBeNull();
    });

    it('should keep all entries when all IDs are in the set', () => {
      setCachedUrl(1, 'http://a');
      setCachedUrl(2, 'http://b');

      purgeStaleCache(new Set([1, 2]));

      expect(getCachedUrl(1)).toBe('http://a');
      expect(getCachedUrl(2)).toBe('http://b');
    });
  });

  describe('purgeStaleCache native delegation', () => {
    it('sends the kept track ids to the native cache', async () => {
      purgeStaleCache(new Set([4, 5]));
      await flushPlayerCommands();
      expect(commands.playerPurgeCache).toHaveBeenLastCalledWith([4, 5]);
    });
  });

  describe('preloadQueueSegments', () => {
    it('resolves the URL and sends it to the native preloader', async () => {
      (api.resolvePlaybackUrl as Mock).mockResolvedValue('https://cdn.example.com/q.m3u8');
      const tracks = [
        { trackId: 100, trackUrl: 'https://soundcloud.com/track/100' },
        { trackId: 101, trackUrl: 'https://soundcloud.com/track/101' },
      ];
      preloadQueueSegments(tracks);
      await vi.waitFor(() =>
        expect(commands.playerPreloadSegments).toHaveBeenCalledWith([{ trackId: 100, url: 'https://cdn.example.com/q.m3u8' }]),
      );
      expect(api.resolvePlaybackUrl).not.toHaveBeenCalledWith(101, expect.any(String));
    });

    it('only preloads from fromIndex onward', async () => {
      (api.resolvePlaybackUrl as Mock).mockResolvedValue('https://cdn.example.com/q2.m3u8');
      const tracks = [
        { trackId: 200, trackUrl: 'https://soundcloud.com/track/200' },
        { trackId: 201, trackUrl: 'https://soundcloud.com/track/201' },
        { trackId: 202, trackUrl: 'https://soundcloud.com/track/202' },
      ];
      preloadQueueSegments(tracks, 1);
      await vi.waitFor(() =>
        expect(commands.playerPreloadSegments).toHaveBeenCalledWith([{ trackId: 201, url: 'https://cdn.example.com/q2.m3u8' }]),
      );
      expect(api.resolvePlaybackUrl).not.toHaveBeenCalledWith(200, expect.any(String));
    });

    it('skips already-preloaded tracks', async () => {
      (api.resolvePlaybackUrl as Mock).mockResolvedValue('https://cdn.example.com/q3.m3u8');
      const tracks = [{ trackId: 300, trackUrl: 'https://soundcloud.com/track/300' }];
      preloadQueueSegments(tracks);
      await vi.waitFor(() => expect(commands.playerPreloadSegments).toHaveBeenCalledTimes(1));
      preloadQueueSegments(tracks);
      await new Promise((r) => setTimeout(r, 50));
      expect(commands.playerPreloadSegments).toHaveBeenCalledTimes(1);
    });
  });
});
