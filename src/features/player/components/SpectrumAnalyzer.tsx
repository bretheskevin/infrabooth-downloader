import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { subscribeSpectrum } from '../utils/spectrumBus';
import { isSettled, smoothTowards, withTaperedTail } from '../utils/spectrumBars';

const BAR_GAP = 2;
const BAR_OPACITY = 0.275;
const BLUR_PX = 4;
const SHADOW_ONLY_SHIFT = 10_000;
const PRIMARY_FALLBACK = '221 83% 53%';
const TAIL_BARS = 3;

interface SpectrumAnalyzerProps {
  className?: string;
}

export function SpectrumAnalyzer({ className }: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bandsRef = useRef<number[]>([]);
  const displayedRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let raf = 0;
    const draw = () => {
      raf = 0;
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      // Resolved per frame (same token read as useWaveformCanvas) so bars follow live theme changes.
      const primary = getComputedStyle(canvas).getPropertyValue('--primary').trim() || PRIMARY_FALLBACK;
      const color = `hsl(${primary})`;
      ctx.fillStyle = color;
      ctx.globalAlpha = BAR_OPACITY;
      ctx.shadowColor = color;
      ctx.shadowBlur = BLUR_PX * 2 * dpr;
      ctx.shadowOffsetX = SHADOW_ONLY_SHIFT * dpr;
      displayedRef.current = smoothTowards(displayedRef.current, bandsRef.current);
      const bars = withTaperedTail(displayedRef.current, TAIL_BARS);
      const barWidth = width / bars.length;
      bars.forEach((value, i) => {
        const barHeight = Math.max(1, value * height);
        ctx.fillRect(i * barWidth + BAR_GAP / 2 - SHADOW_ONLY_SHIFT, height - barHeight, barWidth - BAR_GAP, barHeight);
      });
      if (!isSettled(displayedRef.current, bandsRef.current)) raf = requestAnimationFrame(draw);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const unsubscribe = subscribeSpectrum((bands) => {
      bandsRef.current = bands;
      schedule();
    });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      unsubscribe();
    };
  }, []);

  return <canvas ref={canvasRef} className={cn('pointer-events-none h-full w-full', className)} aria-hidden="true" />;
}
