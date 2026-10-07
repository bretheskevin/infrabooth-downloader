import { EQUALIZER_BAND_FREQUENCIES, EQUALIZER_MAX_GAIN_DB, clampGain } from './equalizerPresets';

export interface GraphPoint {
  x: number;
  y: number;
}

export const EQUALIZER_GRAPH = {
  width: 420,
  height: 210,
  plotLeft: 32,
  plotRight: 396,
  plotTop: 28,
  plotBottom: 180,
} as const;

export const EQUALIZER_GAIN_TICKS = [
  EQUALIZER_MAX_GAIN_DB,
  EQUALIZER_MAX_GAIN_DB / 2,
  0,
  -EQUALIZER_MAX_GAIN_DB / 2,
  -EQUALIZER_MAX_GAIN_DB,
] as const;

const { plotLeft, plotRight, plotTop, plotBottom } = EQUALIZER_GRAPH;
const PLOT_HEIGHT = plotBottom - plotTop;
const GAIN_RANGE = 2 * EQUALIZER_MAX_GAIN_DB;

export function bandX(index: number): number {
  return plotLeft + (index * (plotRight - plotLeft)) / (EQUALIZER_BAND_FREQUENCIES.length - 1);
}

export function gainToY(db: number): number {
  return plotTop + ((EQUALIZER_MAX_GAIN_DB - db) / GAIN_RANGE) * PLOT_HEIGHT;
}

export function yToGain(y: number): number {
  return clampGain(EQUALIZER_MAX_GAIN_DB - ((y - plotTop) / PLOT_HEIGHT) * GAIN_RANGE);
}

export function clientYToPlotY(clientY: number, rect: Pick<DOMRect, 'top' | 'height'>): number {
  return ((clientY - rect.top) / rect.height) * EQUALIZER_GRAPH.height;
}

function slope(a: GraphPoint, b: GraphPoint): number {
  return (b.y - a.y) / (b.x - a.x);
}

function interiorTangent(points: readonly GraphPoint[], i: number): number | null {
  const prev = points[i - 1];
  const curr = points[i];
  const next = points[i + 1];
  if (!prev || !curr || !next) return null;
  const before = slope(prev, curr);
  const after = slope(curr, next);
  if (before * after <= 0) return 0;
  const weighted = (before * (next.x - curr.x) + after * (curr.x - prev.x)) / (next.x - prev.x);
  return Math.sign(before) * Math.min(2 * Math.abs(before), 2 * Math.abs(after), Math.abs(weighted));
}

function monotoneTangents(points: readonly GraphPoint[]): number[] {
  return points.map((point, i) => {
    const interior = interiorTangent(points, i);
    if (interior !== null) return interior;
    const neighbourIndex = i === 0 ? 1 : i - 1;
    const neighbour = points[neighbourIndex];
    if (!neighbour) return 0;
    const secant = slope(point, neighbour);
    return (3 * secant - (interiorTangent(points, neighbourIndex) ?? secant)) / 2;
  });
}

function coords({ x, y }: GraphPoint): string {
  return `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
}

export function smoothCurvePath(points: readonly GraphPoint[]): string {
  const [first] = points;
  if (!first) return '';
  const tangents = monotoneTangents(points);
  const curves = points.slice(1).map((end, i) => {
    const start = points[i] ?? first;
    const dx = (end.x - start.x) / 3;
    const control1 = { x: start.x + dx, y: start.y + dx * (tangents[i] ?? 0) };
    const control2 = { x: end.x - dx, y: end.y - dx * (tangents[i + 1] ?? 0) };
    return `C${coords(control1)} ${coords(control2)} ${coords(end)}`;
  });
  return `M${coords(first)}${curves.join('')}`;
}
