import { describe, expect, it } from 'vitest';
import { VISUALIZER_RENDERERS } from '../renderers';
import { REMOTE_SPECTRUM_BAND_COUNT, VISUALIZER_STYLE_IDS } from '@/lib/remote-protocol';
import { createMockContext } from './mockCanvasContext';

const PALETTE = { hsl: '0 100% 50%' };
const PORTRAIT = { width: 390, height: 844 };
const LANDSCAPE = { width: 844, height: 390 };
const CASES = [PORTRAIT, LANDSCAPE].flatMap((viewport) => [0, 1].map((level) => ({ ...viewport, level })));

function bandsAt(level: number): number[] {
  return Array.from({ length: REMOTE_SPECTRUM_BAND_COUNT }, () => level);
}

function drawCalls(mock: ReturnType<typeof createMockContext>['mock']): number {
  return mock.fillRect.mock.calls.length + mock.fill.mock.calls.length + mock.stroke.mock.calls.length;
}

describe.each(VISUALIZER_STYLE_IDS)('%s renderer', (style) => {
  it.each(CASES)('draws at $width x $height, level $level', ({ width, height, level }) => {
    const { ctx, mock } = createMockContext();
    expect(() => VISUALIZER_RENDERERS[style]({ ctx, bands: bandsAt(level), width, height, palette: PALETTE, time: 0 })).not.toThrow();
    expect(drawCalls(mock)).toBeGreaterThan(0);
    expect(mock.save).toHaveBeenCalledTimes(mock.restore.mock.calls.length);
  });

  it('draws nothing without bands', () => {
    const { ctx, mock } = createMockContext();
    VISUALIZER_RENDERERS[style]({ ctx, bands: [], ...PORTRAIT, palette: PALETTE, time: 0 });
    expect(drawCalls(mock)).toBe(0);
  });
});

describe('bars renderer', () => {
  it('draws one bar per band inside the canvas', () => {
    const { ctx, mock } = createMockContext();
    VISUALIZER_RENDERERS.bars({ ctx, bands: bandsAt(1), ...PORTRAIT, palette: PALETTE, time: 0 });
    expect(mock.fillRect).toHaveBeenCalledTimes(REMOTE_SPECTRUM_BAND_COUNT);
    mock.fillRect.mock.calls.forEach(([x, y, w, h]) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(PORTRAIT.width);
      expect(y + h).toBeLessThanOrEqual(PORTRAIT.height);
    });
  });
});

describe('radial renderer', () => {
  it('draws a mirrored ring that stays inside the shorter side', () => {
    const { ctx, mock } = createMockContext();
    VISUALIZER_RENDERERS.radial({ ctx, bands: bandsAt(1), ...LANDSCAPE, palette: PALETTE, time: 1234 });
    expect(mock.moveTo).toHaveBeenCalledTimes(REMOTE_SPECTRUM_BAND_COUNT * 2);
    const { width, height } = LANDSCAPE;
    mock.lineTo.mock.calls.forEach(([x, y]) => {
      expect(Math.hypot(x - width / 2, y - height / 2)).toBeLessThanOrEqual(Math.min(width, height) / 2);
    });
  });
});
