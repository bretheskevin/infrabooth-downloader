import { applyGlow, hsla } from './palette';
import type { VisualizerRenderer } from './types';

const MAX_HEIGHT_RATIO = 0.6;
const BASELINE_RATIO = 0.12;
const LINE_RATIO = 0.006;

interface Point {
  x: number;
  y: number;
}

function wavePoints(bands: readonly number[], width: number, height: number): Point[] {
  const baseline = height * (1 - BASELINE_RATIO);
  const lastIndex = Math.max(1, bands.length - 1);
  return bands.map((value, i) => ({ x: (i / lastIndex) * width, y: baseline - value * height * MAX_HEIGHT_RATIO }));
}

function traceCurve(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  const first = points[0];
  if (!first) return;
  ctx.moveTo(first.x, first.y);
  points.slice(1).forEach((current, i) => {
    const previous = points[i] ?? current;
    ctx.quadraticCurveTo(previous.x, previous.y, (previous.x + current.x) / 2, (previous.y + current.y) / 2);
  });
  const last = points[points.length - 1] ?? first;
  ctx.lineTo(last.x, last.y);
}

export const drawWave: VisualizerRenderer = ({ ctx, bands, width, height, palette }) => {
  if (bands.length === 0) return;
  const points = wavePoints(bands, width, height);
  const size = Math.min(width, height);
  const gradient = ctx.createLinearGradient(0, height * (1 - BASELINE_RATIO - MAX_HEIGHT_RATIO), 0, height);
  gradient.addColorStop(0, hsla(palette, 0.85));
  gradient.addColorStop(1, hsla(palette, 0.05));
  ctx.save();
  ctx.beginPath();
  traceCurve(ctx, points);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.beginPath();
  traceCurve(ctx, points);
  ctx.strokeStyle = hsla(palette, 1);
  ctx.lineWidth = Math.max(2, size * LINE_RATIO);
  applyGlow(ctx, palette, size, 0.9);
  ctx.stroke();
  ctx.restore();
};
