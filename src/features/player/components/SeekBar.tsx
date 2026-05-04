import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Waveform, WaveformSkeleton } from './Waveform';
import { useWaveform } from '../hooks/useWaveform';
import { usePlayerStore } from '../store';
import { cn } from '@/lib/utils';

interface SeekBarProps {
  waveformUrl?: string;
  className?: string;
}

export function SeekBar({ waveformUrl, className }: SeekBarProps) {
  const { positionMs, durationMs } = usePlayerStore(useShallow((s) => ({ positionMs: s.positionMs, durationMs: s.durationMs })));

  const { samples, isLoading } = useWaveform(waveformUrl ?? null);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  const handleSeek = useCallback(
    (percent: number) => {
      usePlayerStore.getState().seek(Math.floor(percent * durationMs));
    },
    [durationMs],
  );

  if (isLoading || !samples) {
    return (
      <div className={cn('relative h-12 w-full', className)}>
        <WaveformSkeleton className="h-full" />
      </div>
    );
  }

  return (
    <div className={cn('relative h-12 w-full', className)}>
      <Waveform samples={samples} progress={progress} onSeek={handleSeek} className="h-full" />
    </div>
  );
}
