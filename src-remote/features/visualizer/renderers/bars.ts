import { fillColumns } from './columns';
import { hsla } from './palette';
import type { VisualizerRenderer } from './types';

const MAX_HEIGHT_RATIO = 0.8;
const MIN_BAR_PX = 2;

export const drawBars: VisualizerRenderer = (frame) => {
  const { ctx, bands, height, palette } = frame;
  if (bands.length === 0) return;
  const gradient = ctx.createLinearGradient(0, height, 0, height * (1 - MAX_HEIGHT_RATIO));
  gradient.addColorStop(0, hsla(palette, 1));
  gradient.addColorStop(1, hsla(palette, 0.4));
  fillColumns(frame, gradient, (value) => {
    const barHeight = Math.max(MIN_BAR_PX, value * height * MAX_HEIGHT_RATIO);
    return { top: height - barHeight, height: barHeight };
  });
};
