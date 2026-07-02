import { useRef, useEffect, useState } from 'react';

interface WaveformProps {
  samples: number[];
  progress: number;
  onSeek: (progress: number) => void;
}

export default function Waveform({ samples, progress, onSeek }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [scrubProgress, setScrubProgress] = useState<number | null>(null);

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
    const displayProgress = scrubProgress ?? progress;
    const playedIndex = Math.floor(displayProgress * barCount);

    ctx.clearRect(0, 0, width, height);

    const styles = getComputedStyle(canvas);
    const primary = styles.getPropertyValue('--primary').trim() || '258 84% 75%';
    const muted = styles.getPropertyValue('--muted-foreground').trim() || '240 6% 70%';

    const playedColor = `hsl(${primary})`;
    const unplayedColor = `hsl(${muted} / 0.4)`;

    for (let i = 0; i < barCount; i++) {
      const sampleIndex = Math.floor((i / barCount) * samples.length);
      const sample = samples[sampleIndex] ?? 0;
      const normalized = sample / maxSample;

      const barHeight = Math.max(2, normalized * (height - 4));
      const halfBar = barHeight / 2;
      const x = i * step;

      ctx.fillStyle = i <= playedIndex ? playedColor : unplayedColor;
      ctx.fillRect(x, centerY - halfBar, barWidth, barHeight);
    }
  }, [samples, progress, size, scrubProgress]);

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
    <div ref={containerRef} className="relative w-full" style={{ height: 48 }}>
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
