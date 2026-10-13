import { REMOTE_SPECTRUM_BAND_COUNT, type VisualizerStyle } from '@/lib/remote-protocol';
import { smoothTowards } from '@/lib/spectrumBars';
import { VISUALIZER_RENDERERS } from '../renderers';
import { idleBands, mixBands, stepIdleMix } from '../renderers/idle';
import { readPrimaryHsl } from '../renderers/palette';

const NO_FRAME_IDLE_MS = 1000;

export interface VisualizerLoopState {
  target: number[];
  displayed: number[];
  lastFrameAt: number;
  idleMix: number;
}

export interface VisualizerFrameOptions {
  style: VisualizerStyle;
  colorHsl: string | null;
  playing: boolean;
}

export function createLoopState(): VisualizerLoopState {
  return { target: [], displayed: [], lastFrameAt: Number.NEGATIVE_INFINITY, idleMix: 1 };
}

export function resizeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): { width: number; height: number } {
  const { width, height } = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const backingWidth = Math.round(width * dpr);
  const backingHeight = Math.round(height * dpr);
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}

export function renderVisualizerFrame(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  loop: VisualizerLoopState,
  options: VisualizerFrameOptions,
  now: number,
): void {
  const { width, height } = resizeCanvas(canvas, ctx);
  ctx.clearRect(0, 0, width, height);
  loop.displayed = smoothTowards(loop.displayed, loop.target);
  const idle = !options.playing || now - loop.lastFrameAt > NO_FRAME_IDLE_MS;
  loop.idleMix = stepIdleMix(loop.idleMix, idle);
  const bands = mixBands(loop.displayed, idleBands(REMOTE_SPECTRUM_BAND_COUNT, now), loop.idleMix);
  const palette = { hsl: options.colorHsl ?? readPrimaryHsl(canvas) };
  VISUALIZER_RENDERERS[options.style]({ ctx, bands, width, height, palette, time: now });
}
