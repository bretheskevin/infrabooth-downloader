import { applyGlow } from './palette';
import type { RenderFrame } from './types';

const GAP_RATIO = 0.3;

export interface ColumnSpan {
  top: number;
  height: number;
}

export function fillColumns(
  { ctx, bands, width, height, palette }: RenderFrame,
  fill: CanvasGradient,
  spanOf: (value: number) => ColumnSpan,
): void {
  const slot = width / bands.length;
  const barWidth = slot * (1 - GAP_RATIO);
  const inset = (slot - barWidth) / 2;
  ctx.save();
  ctx.fillStyle = fill;
  applyGlow(ctx, palette, Math.min(width, height));
  bands.forEach((value, i) => {
    const span = spanOf(value);
    ctx.fillRect(i * slot + inset, span.top, barWidth, span.height);
  });
  ctx.restore();
}
