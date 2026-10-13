import { DEFAULT_VISUALIZER_SETTINGS, VISUALIZER_STYLE_IDS, type VisualizerSettings, type VisualizerStyle } from '@/lib/remote-protocol';

export type VisualizerToggle = Exclude<keyof VisualizerSettings, 'style'>;

export function cycleStyle(style: VisualizerStyle, direction: 1 | -1): VisualizerStyle {
  const count = VISUALIZER_STYLE_IDS.length;
  const index = VISUALIZER_STYLE_IDS.indexOf(style);
  return VISUALIZER_STYLE_IDS[(index + direction + count) % count] ?? DEFAULT_VISUALIZER_SETTINGS.style;
}
