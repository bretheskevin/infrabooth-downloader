import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/tauri', () => ({
  api: {
    resolvePlaybackUrl: vi.fn(),
  },
}));

import {
  getCachedUrl,
  setCachedUrl,
  preloadQueueSegments,
  preloadSegmentAtTime,
  purgeStaleCache,
} from '../url-cache';
import { api } from '@/lib/tauri';

const MANIFEST = `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
https://cdn.example.com/seg0.ts
#EXTINF:10.0,
https://cdn.example.com/seg1.ts
#EXTINF:5.0,
https://cdn.example.com/seg2.ts
#EXT-X-ENDLIST
`;

function mockFetch(responses: Record<string, { ok: boolean; text?: string; arrayBuffer?: ArrayBuffer }>) {
  return vi.fn((url: string) => {
    const resp = responses[url];
    if (!resp) return Promise.resolve({ ok: false, text: () => Promise.resolve(''), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) });
    return Promise.resolve({
      ok: resp.ok,
      text: () => Promise.resolve(resp.text ?? ''),
      arrayBuffer: () => Promise.resolve(resp.arrayBuffer ?? new ArrayBuffer(0)),
    });
  }) as Mock;
}

describe('url-cache segment preloading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    // Purge all internal state by purging with empty set
    // First seed some known IDs so purge has something to clean
    setCachedUrl(1, 'http://old');
    setCachedUrl(2, 'http://old');
    setCachedUrl(3, 'http://old');
    purgeStaleCache(new Set());
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

  describe('preloadSegmentAtTime', () => {
    it('should fetch the segment covering the given time', async () => {
      const hlsUrl = 'https://cdn.example.com/manifest.m3u8';
      setCachedUrl(42, hlsUrl);

      const fetchMock = mockFetch({
        [hlsUrl]: { ok: true, text: MANIFEST },
        'https://cdn.example.com/seg1.ts': { ok: true },
      });
      vi.stubGlobal('fetch', fetchMock);

      // 10s mark falls in seg1 (10000ms–20000ms)
      await preloadSegmentAtTime(42, 12000);

      expect(fetchMock).toHaveBeenCalledWith(hlsUrl);
      expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/seg1.ts');
    });

    it('should not fetch if no cached URL exists', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await preloadSegmentAtTime(999, 5000);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should not fetch if time is out of range', async () => {
      const hlsUrl = 'https://cdn.example.com/manifest.m3u8';
      setCachedUrl(42, hlsUrl);

      const fetchMock = mockFetch({
        [hlsUrl]: { ok: true, text: MANIFEST },
      });
      vi.stubGlobal('fetch', fetchMock);

      // Total duration is 25s, so 30s is out of range
      await preloadSegmentAtTime(42, 30000);

      // Only the manifest fetch, no segment fetch
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(hlsUrl);
    });

    it('should not re-fetch an already fetched segment', async () => {
      const hlsUrl = 'https://cdn.example.com/manifest2.m3u8';
      setCachedUrl(43, hlsUrl);

      const fetchMock = mockFetch({
        [hlsUrl]: { ok: true, text: MANIFEST },
        'https://cdn.example.com/seg0.ts': { ok: true },
      });
      vi.stubGlobal('fetch', fetchMock);

      await preloadSegmentAtTime(43, 5000); // seg0
      await preloadSegmentAtTime(43, 8000); // seg0 again

      // Manifest fetched once (cached), seg0 fetched once (deduplicated)
      const seg0Calls = fetchMock.mock.calls.filter(
        (c) => c[0] === 'https://cdn.example.com/seg0.ts',
      );
      expect(seg0Calls).toHaveLength(1);
    });

    it('should retry segment fetch after a failure', async () => {
      const hlsUrl = 'https://cdn.example.com/manifest3.m3u8';
      setCachedUrl(44, hlsUrl);

      let callCount = 0;
      const fetchMock = vi.fn((url: string) => {
        if (url === hlsUrl) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(MANIFEST),
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          });
        }
        if (url === 'https://cdn.example.com/seg0.ts') {
          callCount++;
          if (callCount === 1) return Promise.reject(new Error('network error'));
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(''),
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          });
        }
        return Promise.resolve({ ok: false, text: () => Promise.resolve(''), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) });
      }) as Mock;
      vi.stubGlobal('fetch', fetchMock);

      // First attempt fails
      await preloadSegmentAtTime(44, 5000);
      // Second attempt should retry and succeed
      await preloadSegmentAtTime(44, 5000);

      const seg0Calls = fetchMock.mock.calls.filter(
        (c) => c[0] === 'https://cdn.example.com/seg0.ts',
      );
      expect(seg0Calls).toHaveLength(2);
    });
  });

  describe('preloadQueueSegments', () => {
    it('should resolve URLs and fetch first segment for each track', async () => {
      const hlsUrl = 'https://cdn.example.com/q-manifest.m3u8';
      (api.resolvePlaybackUrl as Mock).mockResolvedValue(hlsUrl);

      const fetchMock = mockFetch({
        [hlsUrl]: { ok: true, text: MANIFEST },
        'https://cdn.example.com/seg0.ts': { ok: true },
      });
      vi.stubGlobal('fetch', fetchMock);

      const tracks = [
        { trackId: 100, trackUrl: 'https://soundcloud.com/track/100' },
        { trackId: 101, trackUrl: 'https://soundcloud.com/track/101' },
      ];

      preloadQueueSegments(tracks);

      // Wait for the fire-and-forget async to complete
      await vi.waitFor(() => {
        expect(api.resolvePlaybackUrl).toHaveBeenCalledWith(100, tracks[0]!.trackUrl);
      });

      expect(api.resolvePlaybackUrl).not.toHaveBeenCalledWith(101, expect.any(String));
    });

    it('should only preload from fromIndex onward', async () => {
      const hlsUrl = 'https://cdn.example.com/q-manifest2.m3u8';
      (api.resolvePlaybackUrl as Mock).mockResolvedValue(hlsUrl);

      const fetchMock = mockFetch({
        [hlsUrl]: { ok: true, text: MANIFEST },
        'https://cdn.example.com/seg0.ts': { ok: true },
      });
      vi.stubGlobal('fetch', fetchMock);

      const tracks = [
        { trackId: 200, trackUrl: 'https://soundcloud.com/track/200' },
        { trackId: 201, trackUrl: 'https://soundcloud.com/track/201' },
        { trackId: 202, trackUrl: 'https://soundcloud.com/track/202' },
      ];

      preloadQueueSegments(tracks, 1);

      await vi.waitFor(() => {
        expect(api.resolvePlaybackUrl).toHaveBeenCalledWith(201, tracks[1]!.trackUrl);
      });

      expect(api.resolvePlaybackUrl).not.toHaveBeenCalledWith(200, expect.any(String));
      expect(api.resolvePlaybackUrl).not.toHaveBeenCalledWith(202, expect.any(String));
    });

    it('should skip already-preloaded tracks', async () => {
      const hlsUrl = 'https://cdn.example.com/q-manifest3.m3u8';
      (api.resolvePlaybackUrl as Mock).mockResolvedValue(hlsUrl);

      const fetchMock = mockFetch({
        [hlsUrl]: { ok: true, text: MANIFEST },
        'https://cdn.example.com/seg0.ts': { ok: true },
      });
      vi.stubGlobal('fetch', fetchMock);

      const tracks = [
        { trackId: 300, trackUrl: 'https://soundcloud.com/track/300' },
      ];

      // Preload once and wait for the fire-and-forget async to complete
      preloadQueueSegments(tracks);
      await vi.waitFor(
        () => expect(api.resolvePlaybackUrl).toHaveBeenCalledTimes(1),
        { timeout: 2000 },
      );
      // Allow remaining microtasks (parseManifest + fetchSegment) to settle
      await new Promise((r) => setTimeout(r, 50));

      const callsBefore = (api.resolvePlaybackUrl as Mock).mock.calls.length;

      // Preload again — should be skipped since segmentPreloaded already has 300
      preloadQueueSegments(tracks);
      await new Promise((r) => setTimeout(r, 50));

      expect((api.resolvePlaybackUrl as Mock).mock.calls.length).toBe(callsBefore);
    });
  });
});
