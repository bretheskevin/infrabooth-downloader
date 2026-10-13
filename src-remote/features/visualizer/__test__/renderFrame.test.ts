import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REMOTE_SPECTRUM_BAND_COUNT } from '@/lib/remote-protocol';
import { createLoopState, renderVisualizerFrame, resizeCanvas } from '../utils/renderFrame';
import { createMockContext } from './mockCanvasContext';

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width, height } as DOMRect);
  return canvas;
}

describe('resizeCanvas', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
    vi.restoreAllMocks();
  });

  it('sizes the backing store to the CSS box times DPR', () => {
    const canvas = makeCanvas(200, 100);
    const { ctx, mock } = createMockContext();
    expect(resizeCanvas(canvas, ctx)).toEqual({ width: 200, height: 100 });
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(200);
    expect(mock.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });
});

describe('renderVisualizerFrame', () => {
  afterEach(() => vi.restoreAllMocks());

  it('clears the canvas and stays idle while not playing', () => {
    const canvas = makeCanvas(200, 100);
    const { ctx, mock } = createMockContext();
    const loop = createLoopState();
    renderVisualizerFrame(canvas, ctx, loop, { style: 'bars', colorHsl: null, playing: false }, 0);
    expect(mock.clearRect).toHaveBeenCalledWith(0, 0, 200, 100);
    expect(loop.idleMix).toBe(1);
    expect(mock.fillRect).toHaveBeenCalled();
  });

  it('blends toward live bands while fresh frames arrive', () => {
    const canvas = makeCanvas(200, 100);
    const { ctx } = createMockContext();
    const loop = createLoopState();
    loop.target = Array.from({ length: REMOTE_SPECTRUM_BAND_COUNT }, () => 1);
    loop.lastFrameAt = 500;
    renderVisualizerFrame(canvas, ctx, loop, { style: 'wave', colorHsl: '10 80% 50%', playing: true }, 600);
    expect(loop.idleMix).toBeLessThan(1);
    expect(loop.displayed).toHaveLength(REMOTE_SPECTRUM_BAND_COUNT);
  });

  it('goes idle when frames stop for more than a second', () => {
    const canvas = makeCanvas(200, 100);
    const { ctx } = createMockContext();
    const loop = createLoopState();
    loop.idleMix = 0;
    loop.lastFrameAt = 0;
    renderVisualizerFrame(canvas, ctx, loop, { style: 'radial', colorHsl: null, playing: true }, 1500);
    expect(loop.idleMix).toBeGreaterThan(0);
  });
});
