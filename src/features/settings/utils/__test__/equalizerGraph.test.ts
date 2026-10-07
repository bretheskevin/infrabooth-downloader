import { describe, it, expect } from 'vitest';
import { EQUALIZER_BAND_FREQUENCIES, EQUALIZER_MAX_GAIN_DB } from '@/features/settings/utils/equalizerPresets';
import {
  EQUALIZER_GAIN_TICKS,
  EQUALIZER_GRAPH,
  bandX,
  clientYToPlotY,
  gainToY,
  smoothCurvePath,
  yToGain,
  type GraphPoint,
} from '@/features/settings/utils/equalizerGraph';

const { plotLeft, plotRight, plotTop, plotBottom } = EQUALIZER_GRAPH;

function parsePath(path: string) {
  const [move = '', ...curves] = path.slice(1).split('C');
  const toPairs = (chunk: string) =>
    chunk
      .trim()
      .split(' ')
      .map((pair) => pair.split(',').map(Number));
  return { start: toPairs(move)[0], curves: curves.map(toPairs) };
}

describe('equalizer graph geometry', () => {
  it('maps the gain range onto the plot height', () => {
    expect(gainToY(EQUALIZER_MAX_GAIN_DB)).toBe(plotTop);
    expect(gainToY(-EQUALIZER_MAX_GAIN_DB)).toBe(plotBottom);
    expect(gainToY(0)).toBe((plotTop + plotBottom) / 2);
  });

  it('spreads the bands evenly across the plot width', () => {
    expect(bandX(0)).toBe(plotLeft);
    expect(bandX(EQUALIZER_BAND_FREQUENCIES.length - 1)).toBe(plotRight);
    expect(bandX(2) - bandX(1)).toBeCloseTo(bandX(1) - bandX(0));
  });

  it('converts a plot y back to a snapped gain', () => {
    expect(yToGain(gainToY(3.5))).toBe(3.5);
    expect(yToGain(gainToY(3.3))).toBe(3.5);
    expect(yToGain(gainToY(-2.2))).toBe(-2);
  });

  it('clamps gains beyond the plot to the gain range', () => {
    expect(yToGain(plotTop - 50)).toBe(EQUALIZER_MAX_GAIN_DB);
    expect(yToGain(plotBottom + 50)).toBe(-EQUALIZER_MAX_GAIN_DB);
  });

  it('converts a pointer position using the rendered size of the graph', () => {
    const rect = { top: 100, height: EQUALIZER_GRAPH.height * 2 };
    expect(clientYToPlotY(100 + gainToY(4) * 2, rect)).toBe(gainToY(4));
  });

  it('ticks the gain axis at full and half range', () => {
    const max = EQUALIZER_MAX_GAIN_DB;
    expect(EQUALIZER_GAIN_TICKS).toEqual([max, max / 2, 0, -max / 2, -max]);
  });
});

describe('smoothCurvePath', () => {
  it('returns an empty path without points', () => {
    expect(smoothCurvePath([])).toBe('');
  });

  it('keeps a flat curve flat', () => {
    const points = [
      { x: 0, y: 50 },
      { x: 30, y: 50 },
      { x: 60, y: 50 },
    ];
    expect(smoothCurvePath(points)).toBe('M0,50C10,50 20,50 30,50C40,50 50,50 60,50');
  });

  it('draws a straight line between two points', () => {
    expect(
      smoothCurvePath([
        { x: 0, y: 0 },
        { x: 30, y: 60 },
      ]),
    ).toBe('M0,0C10,20 20,40 30,60');
  });

  it('passes through every point', () => {
    const points = [
      { x: 0, y: 10 },
      { x: 30, y: 80 },
      { x: 60, y: 40 },
      { x: 90, y: 90 },
    ];
    const { start, curves } = parsePath(smoothCurvePath(points));
    expect(start).toEqual([0, 10]);
    expect(curves.map((curve) => curve[2])).toEqual(points.slice(1).map(({ x, y }) => [x, y]));
  });

  it('never overshoots between neighbouring points', () => {
    const points: GraphPoint[] = [
      { x: 0, y: 100 },
      { x: 30, y: 20 },
      { x: 60, y: 20 },
      { x: 90, y: 100 },
      { x: 120, y: 60 },
      { x: 150, y: 0 },
    ];
    const { curves } = parsePath(smoothCurvePath(points));
    curves.forEach((curve, i) => {
      const low = Math.min(points[i]?.y ?? 0, points[i + 1]?.y ?? 0);
      const high = Math.max(points[i]?.y ?? 0, points[i + 1]?.y ?? 0);
      for (const [, y = Number.NaN] of curve.slice(0, 2)) {
        expect(y).toBeGreaterThanOrEqual(low);
        expect(y).toBeLessThanOrEqual(high);
      }
    });
  });
});
