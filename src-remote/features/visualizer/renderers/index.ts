import type { VisualizerStyle } from '@/lib/remote-protocol';
import { drawBars } from './bars';
import { drawMirrored } from './mirrored';
import { drawRadial } from './radial';
import { drawWave } from './wave';
import type { VisualizerRenderer } from './types';

export const VISUALIZER_RENDERERS: Record<VisualizerStyle, VisualizerRenderer> = {
  bars: drawBars,
  mirrored: drawMirrored,
  radial: drawRadial,
  wave: drawWave,
};
