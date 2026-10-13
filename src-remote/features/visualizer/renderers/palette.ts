export interface VisualizerPalette {
  hsl: string;
}

const PRIMARY_FALLBACK_HSL = '221 83% 53%';
const GLOW_RATIO = 0.04;

export function hsla(palette: VisualizerPalette, alpha: number): string {
  return `hsl(${palette.hsl} / ${alpha})`;
}

export function readPrimaryHsl(element: Element): string {
  return getComputedStyle(element).getPropertyValue('--primary').trim() || PRIMARY_FALLBACK_HSL;
}

export function applyGlow(ctx: CanvasRenderingContext2D, palette: VisualizerPalette, size: number, alpha = 0.8): void {
  ctx.shadowColor = hsla(palette, alpha);
  ctx.shadowBlur = size * GLOW_RATIO;
}
