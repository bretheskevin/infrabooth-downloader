import { useRef, useState } from 'react';
import { useWaveformCanvas } from '@/lib/useWaveformCanvas';

interface WaveformProps {
  samples: number[];
  progress: number;
  onSeek: (progress: number) => void;
}

export default function Waveform({ samples, progress, onSeek }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrubProgress, setScrubProgress] = useState<number | null>(null);

  useWaveformCanvas(canvasRef, {
    samples,
    progress: scrubProgress ?? progress,
    primaryFallback: '258 84% 75%',
    mutedFallback: '240 6% 70%',
  });

  function getProgressFromPointer(e: React.PointerEvent<HTMLCanvasElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubProgress(getProgressFromPointer(e));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (scrubProgress === null) return;
    setScrubProgress(getProgressFromPointer(e));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (scrubProgress === null) return;
    const p = getProgressFromPointer(e);
    setScrubProgress(null);
    onSeek(p);
  }

  function handlePointerCancel() {
    setScrubProgress(null);
  }

  return (
    <div className="relative w-full" style={{ height: 48 }}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />
    </div>
  );
}
