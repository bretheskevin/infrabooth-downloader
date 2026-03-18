import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

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

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    let maxSample = 1;
    for (const s of samples) {
      if (s > maxSample) maxSample = s;
    }

    const barWidth = 2;
    const gap = 1;
    const step = barWidth + gap;
    const barCount = Math.floor(width / step);
    const playedIndex = Math.floor(progress * barCount);

    ctx.clearRect(0, 0, width, height);

    const styles = getComputedStyle(canvas);
    const playedColor = styles.getPropertyValue('--primary').trim() || '221 83% 53%';
    const unplayedColor =
      styles.getPropertyValue('--muted-foreground').trim() || '215 16% 47%';
    const hoverIndex = hoverProgress !== null ? Math.floor(hoverProgress * barCount) : -1;

    for (let i = 0; i < barCount; i++) {
      const sampleIndex = Math.floor((i / barCount) * samples.length);
      const sample = samples[sampleIndex] ?? 0;
      const normalized = sample / maxSample;

      const barHeight = Math.max(2, normalized * (height - 4));
      const halfBar = barHeight / 2;
      const x = i * step;

      if (i <= playedIndex) {
        ctx.fillStyle = `hsl(${playedColor})`;
      } else if (hoverIndex >= 0 && i <= hoverIndex) {
        ctx.fillStyle = `hsl(${unplayedColor} / 0.6)`;
      } else {
        ctx.fillStyle = `hsl(${unplayedColor} / 0.4)`;
      }
      ctx.fillRect(x, centerY - halfBar, barWidth, barHeight);
    }
  }, [samples, progress, size, hoverProgress]);

  const getProgress = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
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
