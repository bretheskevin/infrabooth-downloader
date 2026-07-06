import { useEffect, useState, type RefObject } from 'react';
import { drawWaveform } from '@/lib/waveform';

export interface UseWaveformCanvasOptions {
  samples: number[];
  progress: number;
  hoverProgress?: number | null;
  primaryFallback?: string;
  mutedFallback?: string;
}

export function useWaveformCanvas(canvasRef: RefObject<HTMLCanvasElement | null>, options: UseWaveformCanvasOptions): void {
  const { samples, progress, hoverProgress, primaryFallback = '221 83% 53%', mutedFallback = '215 16% 47%' } = options;

  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || samples.length === 0 || size.w === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const styles = getComputedStyle(canvas);
    const primaryValue = styles.getPropertyValue('--primary').trim() || primaryFallback;
    const mutedValue = styles.getPropertyValue('--muted-foreground').trim() || mutedFallback;

    drawWaveform(ctx, samples, {
      progress,
      width: rect.width,
      height: rect.height,
      playedColor: `hsl(${primaryValue})`,
      barColor: `hsl(${mutedValue} / 0.4)`,
      hoverProgress,
      hoverBarColor: `hsl(${mutedValue} / 0.6)`,
    });
  }, [samples, progress, size, hoverProgress, primaryFallback, mutedFallback, canvasRef]);
}
