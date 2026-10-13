import type { VisualizerPalette } from './palette';

export interface RenderFrame {
  ctx: CanvasRenderingContext2D;
  bands: readonly number[];
  width: number;
  height: number;
  palette: VisualizerPalette;
  time: number;
}

export type VisualizerRenderer = (frame: RenderFrame) => void;
