const SAMPLE_SIZE = 16;
const MIN_WEIGHT_PER_PIXEL = 0.08;
const MIN_SATURATION = 55;
const MIN_LIGHTNESS = 45;
const MAX_LIGHTNESS = 65;

function hueOf(rn: number, gn: number, bn: number, max: number, d: number): number {
  if (max === rn) return (gn - bn) / d + (gn < bn ? 6 : 0);
  if (max === gn) return (bn - rn) / d + 2;
  return (rn - gn) / d + 4;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  return [hueOf(rn, gn, bn, max, d) * 60, s * 100, l * 100];
}

export function dominantHsl(data: ArrayLike<number>): string | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let weightSum = 0;
  const pixelCount = Math.floor(data.length / 4);
  for (let i = 0; i < pixelCount * 4; i += 4) {
    const pr = data[i] ?? 0;
    const pg = data[i + 1] ?? 0;
    const pb = data[i + 2] ?? 0;
    const weight = ((Math.max(pr, pg, pb) - Math.min(pr, pg, pb)) / 255) * ((data[i + 3] ?? 0) / 255);
    r += pr * weight;
    g += pg * weight;
    b += pb * weight;
    weightSum += weight;
  }
  if (pixelCount === 0 || weightSum / pixelCount < MIN_WEIGHT_PER_PIXEL) return null;
  const [h, s, l] = rgbToHsl(r / weightSum, g / weightSum, b / weightSum);
  const lightness = Math.min(MAX_LIGHTNESS, Math.max(MIN_LIGHTNESS, l));
  return `${Math.round(h)} ${Math.round(Math.max(MIN_SATURATION, s))}% ${Math.round(lightness)}%`;
}

function readImageColor(image: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    return dominantHsl(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
  } catch {
    // tainted canvas (artwork CDN without CORS): fall back to the accent color
    return null;
  }
}

export function sampleArtworkColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(readImageColor(image));
    image.onerror = () => resolve(null);
    image.src = url;
  });
}
