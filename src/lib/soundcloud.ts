export type ArtworkSize = 20 | 32 | 47 | 50 | 67 | 200 | 300 | 500;

export function getArtworkUrl(url: string | null, size: ArtworkSize = 67): string | null {
  if (!url) return null;
  return url.replace('-large', `-t${size}x${size}`);
}

export function buildTrackApiUrl(id: number | string): string {
  return `https://api.soundcloud.com/tracks/${id}`;
}

export function normalizeShortUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}
