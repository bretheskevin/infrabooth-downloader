import { useRef, useCallback, useState, useMemo } from 'react';
import { cn, clamp } from '@/lib/utils';
import { useWaveformCanvas } from '@/lib/useWaveformCanvas';

interface WaveformProps {
  samples: number[];
  progress: number;
  onSeek?: (progress: number) => void;
  className?: string;
}

export function Waveform({ samples, progress, onSeek, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);

  useWaveformCanvas(canvasRef, {
    samples,
    progress,
    hoverProgress,
    primaryFallback: '221 83% 53%',
    mutedFallback: '215 16% 47%',
  });

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
    <div className={cn('relative h-8 w-full', className)}>
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
