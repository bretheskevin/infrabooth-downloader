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

interface ParsedSegment {
  url: string;
  startMs: number;
  endMs: number;
}

const segmentPreloaded = new Set<number>();
const manifestCache = new Map<number, ParsedSegment[]>();
const segmentFetched = new Set<string>();

async function parseManifest(trackId: number): Promise<ParsedSegment[] | null> {
  const hlsUrl = getCachedUrl(trackId);
  if (!hlsUrl) return null;

  const cached = manifestCache.get(trackId);
  if (cached) return cached;

  try {
    const res = await fetch(hlsUrl);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.split('\n');
    const segments: ParsedSegment[] = [];
    let currentTimeMs = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      if (line.startsWith('#EXTINF:')) {
        const extinfValue = line.split(':')[1] ?? '';
        if (!extinfValue) continue;
        const duration = parseFloat(extinfValue.split(',')[0] ?? '');
        const durationMs = duration * 1000;
        const urlLine = lines[i + 1]?.trim();
        if (urlLine && !urlLine.startsWith('#')) {
          const url = urlLine.startsWith('http')
            ? urlLine
            : new URL(urlLine, hlsUrl).href;
          segments.push({ url, startMs: currentTimeMs, endMs: currentTimeMs + durationMs });
          currentTimeMs += durationMs;
        }
      }
    }

    if (segments.length > 0) {
      manifestCache.set(trackId, segments);
    }
    return segments;
  } catch {
    return null;
  }
}

async function fetchSegment(url: string): Promise<void> {
  if (segmentFetched.has(url)) return;
  try {
    const res = await fetch(url);
    await res.arrayBuffer();
    segmentFetched.add(url);
  } catch {
    // best-effort — will retry on next attempt
  }
}

export function preloadQueueSegments(
  tracks: Array<{ trackId: number; trackUrl: string }>,
  fromIndex = 0,
): void {
  const toPreload = tracks.slice(fromIndex).filter((t) => !segmentPreloaded.has(t.trackId));
  if (toPreload.length === 0) return;

  void (async () => {
    for (let i = 0; i < toPreload.length; i += MAX_CONCURRENT) {
      const batch = toPreload.slice(i, i + MAX_CONCURRENT);
      await Promise.allSettled(
        batch.map(async (track) => {
          await resolveWithCache(track.trackId, track.trackUrl);
          segmentPreloaded.add(track.trackId);
          const segments = await parseManifest(track.trackId);
          if (segments && segments.length > 0) {
            await fetchSegment(segments[0]!.url);
          }
        }),
      );
    }
  })();
}

export async function preloadSegmentAtTime(trackId: number, timeMs: number): Promise<void> {
  const segments = await parseManifest(trackId);
  if (!segments) return;

  const segment = segments.find((s) => timeMs >= s.startMs && timeMs < s.endMs);
  if (!segment) return;
  await fetchSegment(segment.url);
}

export function purgeStaleCache(trackIds: Set<number>): void {
  for (const id of cache.keys()) {
    if (!trackIds.has(id)) cache.delete(id);
  }
  for (const id of segmentPreloaded) {
    if (!trackIds.has(id)) segmentPreloaded.delete(id);
  }
  for (const id of manifestCache.keys()) {
    if (!trackIds.has(id)) manifestCache.delete(id);
  }
  const keepUrls = new Set([...manifestCache.values()].flat().map((s) => s.url));
  for (const url of segmentFetched) {
    if (!keepUrls.has(url)) segmentFetched.delete(url);
  }
}
