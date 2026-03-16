import { api } from '@/lib/tauri';

interface CachedUrl {
  url: string;
  /** Timestamp when cached — URLs expire after the TTL. */
  cachedAt: number;
}

const URL_TTL_MS = 10 * 60 * 1000; // 10 minutes (SC signed URLs last ~15-30min)
const MAX_CONCURRENT = 4;
const cache = new Map<number, CachedUrl>();
let preloadAbort: AbortController | null = null;

/** Get a cached URL if it exists and hasn't expired. */
export function getCachedUrl(trackId: number): string | null {
  const entry = cache.get(trackId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > URL_TTL_MS) {
    cache.delete(trackId);
    return null;
  }
  return entry.url;
}

/** Store a resolved URL in the cache. */
export function setCachedUrl(trackId: number, url: string): void {
  cache.set(trackId, { url, cachedAt: Date.now() });
}

/**
 * Preload playback URLs for a list of tracks.
 * Resolves up to MAX_CONCURRENT tracks in parallel.
 * Aborts any previous preload operation.
 */
export function preloadPlaybackUrls(
  tracks: Array<{ trackId: number; trackUrl: string }>,
): void {
  // Abort previous preload
  if (preloadAbort) {
    preloadAbort.abort();
  }
  preloadAbort = new AbortController();
  const signal = preloadAbort.signal;

  // Filter out already-cached tracks
  const toResolve = tracks.filter((t) => !getCachedUrl(t.trackId));
  if (toResolve.length === 0) return;

  // Process in batches of MAX_CONCURRENT
  const processBatch = async (batch: typeof toResolve) => {
    await Promise.allSettled(
      batch.map(async (track) => {
        if (signal.aborted) return;
        try {
          const url = await api.resolvePlaybackUrl(track.trackId, track.trackUrl);
          if (!signal.aborted) {
            setCachedUrl(track.trackId, url);
          }
        } catch {
          // Silently ignore preload failures
        }
      }),
    );
  };

  // Run batches sequentially to avoid rate limiting (fire-and-forget)
  void (async () => {
    for (let i = 0; i < toResolve.length; i += MAX_CONCURRENT) {
      if (signal.aborted) return;
      const batch = toResolve.slice(i, i + MAX_CONCURRENT);
      await processBatch(batch);
    }
  })();
}
