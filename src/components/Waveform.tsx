import { useRef, useCallback, useState, useMemo } from 'react';
import { cn, clamp } from '@/lib/utils';
import { useWaveformCanvas } from '@/lib/useWaveformCanvas';

const PRIMARY_FALLBACK = '258 90% 66%';
const MUTED_FALLBACK = '240 4% 46%';

type WaveformInteraction = 'hover' | 'scrub';

interface WaveformProps {
  samples: number[];
  progress: number;
  onSeek?: (progress: number) => void;
  className?: string;
  interaction?: WaveformInteraction;
}

export function Waveform({ samples, progress, onSeek, className, interaction = 'hover' }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [scrubProgress, setScrubProgress] = useState<number | null>(null);
  const scrub = interaction === 'scrub';

  useWaveformCanvas(canvasRef, {
    samples,
    progress: scrubProgress ?? progress,
    hoverProgress: scrub ? null : hoverProgress,
    primaryFallback: PRIMARY_FALLBACK,
    mutedFallback: MUTED_FALLBACK,
  });

  const getProgress = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return clamp((e.clientX - rect.left) / rect.width, 0, 1);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      onSeek?.(getProgress(e));
    },
    [onSeek, getProgress],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => setHoverProgress(getProgress(e)), [getProgress]);
  const handleMouseLeave = useCallback(() => setHoverProgress(null), []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setScrubProgress(getProgress(e));
    },
    [getProgress],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (scrubProgress === null) return;
      setScrubProgress(getProgress(e));
    },
    [scrubProgress, getProgress],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (scrubProgress === null) return;
      const p = getProgress(e);
      setScrubProgress(null);
      onSeek?.(p);
    },
    [scrubProgress, getProgress, onSeek],
  );

  const handlePointerCancel = useCallback(() => setScrubProgress(null), []);

  return (
    <div className={cn('relative h-8 w-full', className)}>
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-pointer"
        style={scrub ? { touchAction: 'none' } : undefined}
        onClick={scrub ? undefined : handleClick}
        onMouseMove={scrub ? undefined : handleMouseMove}
        onMouseLeave={scrub ? undefined : handleMouseLeave}
        onPointerDown={scrub ? handlePointerDown : undefined}
        onPointerMove={scrub ? handlePointerMove : undefined}
        onPointerUp={scrub ? handlePointerUp : undefined}
        onPointerCancel={scrub ? handlePointerCancel : undefined}
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
