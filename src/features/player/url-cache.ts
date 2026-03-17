import { api } from '@/lib/tauri';

interface CachedUrl {
  url: string;
  /** Timestamp when cached — URLs expire after the TTL. */
  cachedAt: number;
}

const URL_TTL_MS = 10 * 60 * 1000; // 10 minutes (SC signed URLs last ~15-30min)
const MAX_CONCURRENT = 4;
const PRELOAD_DEBOUNCE_MS = 150;
const cache = new Map<number, CachedUrl>();
const inFlight = new Map<number, Promise<string>>();
let preloadTimer: ReturnType<typeof setTimeout> | null = null;

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

/** Resolve a single track, deduplicating concurrent requests. */
function resolveOne(trackId: number, trackUrl: string): Promise<string> {
  const existing = inFlight.get(trackId);
  if (existing) return existing;

  const promise = api
    .resolvePlaybackUrl(trackId, trackUrl)
    .then((url) => {
      setCachedUrl(trackId, url);
      return url;
    })
    .finally(() => {
      inFlight.delete(trackId);
    });

  inFlight.set(trackId, promise);
  return promise;
}

/** Resolve a playback URL, reusing cache or in-flight preload. */
export async function resolveWithCache(
  trackId: number,
  trackUrl: string,
): Promise<string> {
  const cached = getCachedUrl(trackId);
  if (cached) return cached;
  return resolveOne(trackId, trackUrl);
}

/**
 * Preload playback URLs for a list of tracks.
 * Debounced to avoid spamming during scroll. Skips already-cached and in-flight tracks.
 * Resolves up to MAX_CONCURRENT tracks in parallel.
 */
export function preloadPlaybackUrls(
  tracks: Array<{ trackId: number; trackUrl: string }>,
): void {
  if (preloadTimer) {
    clearTimeout(preloadTimer);
  }

  preloadTimer = setTimeout(() => {
    const toResolve = tracks.filter(
      (t) => !getCachedUrl(t.trackId) && !inFlight.has(t.trackId),
    );
    if (toResolve.length === 0) return;

    const processBatch = async (batch: typeof toResolve) => {
      await Promise.allSettled(
        batch.map((track) => resolveOne(track.trackId, track.trackUrl)),
      );
    };

    void (async () => {
      for (let i = 0; i < toResolve.length; i += MAX_CONCURRENT) {
        const batch = toResolve.slice(i, i + MAX_CONCURRENT);
        await processBatch(batch);
      }
    })();
  }, PRELOAD_DEBOUNCE_MS);
}
