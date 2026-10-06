import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import { commands } from '@/bindings';
import { sendPlayerCommand } from './player-commands';

interface CachedUrl {
  url: string;
  expiresAt: number;
}

const URL_TTL_MS = 3 * 60 * 1000;
const EXPIRY_MARGIN_MS = 30_000;
const MAX_CONCURRENT = 2;
const HOVER_PRELOAD_DELAY_MS = 300;
const cache = new Map<number, CachedUrl>();
const inFlight = new Map<number, Promise<string>>();
const segmentPreloaded = new Set<number>();
const NOOP = () => {};

function extractUrlExpiration(url: string): number | null {
  try {
    const policyParam = new URL(url).searchParams.get('Policy');
    if (!policyParam) return null;
    const b64 = policyParam.replace(/~/g, '/').replace(/_/g, '=').replace(/-/g, '+');
    const policy = JSON.parse(atob(b64));
    const epoch = policy?.Statement?.[0]?.Condition?.DateLessThan?.['AWS:EpochTime'];
    return typeof epoch === 'number' ? epoch * 1000 : null;
  } catch {
    return null;
  }
}

function isCacheValid(trackId: number): boolean {
  const entry = cache.get(trackId);
  return !!entry && Date.now() < entry.expiresAt - EXPIRY_MARGIN_MS;
}

export function getCachedUrl(trackId: number): string | null {
  const entry = cache.get(trackId);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt - EXPIRY_MARGIN_MS) {
    cache.delete(trackId);
    segmentPreloaded.delete(trackId);
    return null;
  }
  return entry.url;
}

/** Store a resolved URL in the cache. */
export function setCachedUrl(trackId: number, url: string): void {
  const expiresAt = extractUrlExpiration(url) ?? Date.now() + URL_TTL_MS;
  cache.set(trackId, { url, expiresAt });
}

/** Drop all cached data for a track so the next access forces a fresh resolve. */
export function invalidateCachedUrl(trackId: number): void {
  cache.delete(trackId);
  segmentPreloaded.delete(trackId);
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
export async function resolveWithCache(trackId: number, trackUrl: string): Promise<string> {
  const cached = getCachedUrl(trackId);
  if (cached) return cached;
  void logger.debug(`[url-cache] Cache miss for track ${trackId}, refetching URL`);
  return resolveOne(trackId, trackUrl);
}

/**
 * Preload a track's playback URL on hover.
 * Waits HOVER_PRELOAD_DELAY_MS before firing the request so brief hovers are free.
 * Returns a cancel function that clears the timer if the user leaves.
 */
export function preloadOnHover(trackId: number, trackUrl: string): () => void {
  if (getCachedUrl(trackId) || inFlight.has(trackId)) return NOOP;

  const timer = setTimeout(() => {
    void resolveOne(trackId, trackUrl).catch(() => {});
  }, HOVER_PRELOAD_DELAY_MS);

  return () => clearTimeout(timer);
}

/**
 * Immediately start resolving a track's playback URL (no delay).
 * Called on mousedown so the URL is cached by the time the click handler fires.
 */
export function preloadImmediate(trackId: number, trackUrl: string): void {
  if (getCachedUrl(trackId) || inFlight.has(trackId)) return;
  void resolveOne(trackId, trackUrl).catch(() => {});
}

// ---------------------------------------------------------------------------
// Segment preloading (delegated to the native player cache)
// ---------------------------------------------------------------------------

async function resolveForPreload(track: { trackId: number; trackUrl: string }) {
  const url = await resolveWithCache(track.trackId, track.trackUrl);
  segmentPreloaded.add(track.trackId);
  return { trackId: track.trackId, url };
}

/**
 * Preload the next `limit` tracks in a queue starting from `fromIndex`.
 * Resolves their playback URLs and asks the native player to cache the first segment of each.
 */
export function preloadQueueSegments(tracks: Array<{ trackId: number; trackUrl: string }>, fromIndex = 0, limit = 1): void {
  const toPreload = tracks.slice(fromIndex, fromIndex + limit).filter((t) => {
    const needsRefresh = segmentPreloaded.has(t.trackId) && !isCacheValid(t.trackId);
    if (needsRefresh) {
      void logger.debug(`[url-cache] Expired URL for track ${t.trackId}, re-preloading`);
    }
    return !segmentPreloaded.has(t.trackId) || needsRefresh;
  });
  if (toPreload.length === 0) return;

  void (async () => {
    for (let i = 0; i < toPreload.length; i += MAX_CONCURRENT) {
      const settled = await Promise.allSettled(toPreload.slice(i, i + MAX_CONCURRENT).map(resolveForPreload));
      settled.forEach((r) => {
        if (r.status === 'rejected') void logger.warn(`[url-cache] Preload URL resolution failed: ${String(r.reason)}`);
      });
      const ready = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      if (ready.length > 0) {
        sendPlayerCommand('playerPreloadSegments', () => commands.playerPreloadSegments(ready));
      }
    }
  })();
}

export function purgeStaleCache(trackIds: Set<number>): void {
  for (const id of cache.keys()) {
    if (!trackIds.has(id)) cache.delete(id);
  }
  for (const id of segmentPreloaded) {
    if (!trackIds.has(id)) segmentPreloaded.delete(id);
  }
  sendPlayerCommand('playerPurgeCache', () => commands.playerPurgeCache([...trackIds]));
}
