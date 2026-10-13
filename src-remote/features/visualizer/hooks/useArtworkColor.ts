import { useEffect, useState } from 'react';
import { sampleArtworkColor } from '../utils/artworkColor';

const colorCache = new Map<string, string | null>();

export function useArtworkColor(artworkUrl: string | null): string | null {
  const [resolved, setResolved] = useState<{ url: string; hsl: string | null } | null>(null);

  useEffect(() => {
    if (!artworkUrl || colorCache.has(artworkUrl)) return;
    let cancelled = false;
    void sampleArtworkColor(artworkUrl).then((hsl) => {
      colorCache.set(artworkUrl, hsl);
      if (!cancelled) setResolved({ url: artworkUrl, hsl });
    });
    return () => {
      cancelled = true;
    };
  }, [artworkUrl]);

  if (!artworkUrl) return null;
  if (colorCache.has(artworkUrl)) return colorCache.get(artworkUrl) ?? null;
  return resolved?.url === artworkUrl ? resolved.hsl : null;
}
