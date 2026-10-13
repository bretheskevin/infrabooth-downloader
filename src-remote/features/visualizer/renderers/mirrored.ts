import { fillColumns } from './columns';
import { hsla } from './palette';
import type { VisualizerRenderer } from './types';

const MAX_HALF_RATIO = 0.42;
const MIN_HALF_PX = 1;

export const drawMirrored: VisualizerRenderer = (frame) => {
  const { ctx, bands, height, palette } = frame;
  if (bands.length === 0) return;
  const mid = height / 2;
  const reach = height * MAX_HALF_RATIO;
  const gradient = ctx.createLinearGradient(0, mid - reach, 0, mid + reach);
  gradient.addColorStop(0, hsla(palette, 0.35));
  gradient.addColorStop(0.5, hsla(palette, 1));
  gradient.addColorStop(1, hsla(palette, 0.35));
  fillColumns(frame, gradient, (value) => {
    const half = Math.max(MIN_HALF_PX, value * reach);
    return { top: mid - half, height: half * 2 };
  });
};
