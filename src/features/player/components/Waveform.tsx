import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { cn, clamp } from '@/lib/utils';
import { drawWaveform } from '@/lib/waveform';

interface WaveformProps {
  samples: number[];
  progress: number;
  onSeek?: (progress: number) => void;
  className?: string;
}

export function Waveform({ samples, progress, onSeek, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
    const playedColorValue = styles.getPropertyValue('--primary').trim() || '221 83% 53%';
    const unplayedColorValue = styles.getPropertyValue('--muted-foreground').trim() || '215 16% 47%';

    drawWaveform(ctx, samples, {
      progress,
      width: rect.width,
      height: rect.height,
      playedColor: `hsl(${playedColorValue})`,
      barColor: `hsl(${unplayedColorValue} / 0.4)`,
      hoverProgress,
      hoverBarColor: `hsl(${unplayedColorValue} / 0.6)`,
    });
  }, [samples, progress, size, hoverProgress]);

  const getProgress = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return clamp(x / rect.width, 0, 1);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSeek) return;
      onSeek(getProgress(e));
    },
    [onSeek, getProgress],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setHoverProgress(getProgress(e));
    },
    [getProgress],
  );

  const handleMouseLeave = useCallback(() => setHoverProgress(null), []);

  return (
    <div ref={containerRef} className={cn('relative h-8 w-full', className)}>
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-pointer"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}

export function WaveformSkeleton({ className }: { className?: string }) {
  const heights = useMemo(() => Array.from({ length: 60 }, () => Math.random() * 60 + 20), []);

  return (
    <div className={cn('relative h-8 w-full flex items-center justify-center gap-[3px]', className)}>
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[2px] bg-muted-foreground/20 rounded-full animate-pulse"
          style={{ height: `${h}%`, animationDelay: `${i * 20}ms` }}
        />
      ))}
    </div>
  );
}
