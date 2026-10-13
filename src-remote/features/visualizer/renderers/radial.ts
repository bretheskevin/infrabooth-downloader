import { applyGlow, hsla } from './palette';
import type { VisualizerRenderer } from './types';

const RADIAL_INNER_RATIO = 0.22;
export const RADIAL_ARTWORK_RATIO = RADIAL_INNER_RATIO * 2 * 0.85;
const MAX_LENGTH_RATIO = 0.25;
const MIN_LENGTH_PX = 2;
const ROTATION_PER_MS = 0.00004;
const LINE_FILL_RATIO = 0.6;

function mirroredRing(bands: readonly number[]): number[] {
  return [...bands, ...[...bands].reverse()];
}

export const drawRadial: VisualizerRenderer = ({ ctx, bands, width, height, palette, time }) => {
  if (bands.length === 0) return;
  const ring = mirroredRing(bands);
  const size = Math.min(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const inner = size * RADIAL_INNER_RATIO;
  const step = (Math.PI * 2) / ring.length;
  const rotation = time * ROTATION_PER_MS - Math.PI / 2;
  ctx.save();
  ctx.strokeStyle = hsla(palette, 0.95);
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, inner * step * LINE_FILL_RATIO);
  applyGlow(ctx, palette, size);
  ctx.beginPath();
  ring.forEach((value, i) => {
    const angle = rotation + i * step;
    const outer = inner + Math.max(MIN_LENGTH_PX, value * size * MAX_LENGTH_RATIO);
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
  });
  ctx.stroke();
  ctx.restore();
};
