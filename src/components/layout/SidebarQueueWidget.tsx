import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useQueueStore } from '@/features/queue/store';
import { Progress } from '@/components/ui/progress';

const TERMINAL_STATUSES = new Set(['complete', 'failed', 'skipped']);

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function SidebarQueueWidget() {
  const { t } = useTranslation();

  const { tracks, currentIndex, totalTracks, isProcessing, isInitializing } = useQueueStore(
    useShallow((s) => ({
      tracks: s.tracks,
      currentIndex: s.currentIndex,
      totalTracks: s.totalTracks,
      isProcessing: s.isProcessing,
      isInitializing: s.isInitializing,
    })),
  );

  const derivedCompleted = useMemo(() => tracks.filter((track) => TERMINAL_STATUSES.has(track.status)).length, [tracks]);

  const activeTrack = useMemo(() => tracks.find((track) => track.status === 'downloading') ?? tracks[currentIndex], [tracks, currentIndex]);

  const totalBytes = useMemo(() => tracks.reduce((sum, track) => sum + (track.downloadedBytes ?? 0), 0), [tracks]);

  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isProcessing && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
    if (!isProcessing && !isInitializing) {
      startTimeRef.current = null;
    }
  }, [isProcessing, isInitializing]);

  const avgSpeed = useMemo(() => {
    if (!startTimeRef.current || totalBytes === 0) return null;
    const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
    if (elapsedSec < 1) return null;
    return formatSpeed(totalBytes / elapsedSec);
  }, [totalBytes]);

  const overallPercent = useMemo(() => {
    if (totalTracks === 0) return 0;
    const total = tracks.reduce((sum, track) => {
      if (TERMINAL_STATUSES.has(track.status)) return sum + 100;
      return sum + (track.percent ?? 0);
    }, 0);
    return Math.round(total / totalTracks);
  }, [tracks, totalTracks]);

  if (!isProcessing && !isInitializing) {
    return null;
  }

  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium truncate">{activeTrack?.title}</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {t('sidebar.queueProgress', {
            completed: derivedCompleted,
            total: totalTracks,
          })}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isInitializing && !isProcessing ? t('sidebar.preparing') : t('sidebar.downloading')}
        </p>
        {avgSpeed && <span className="text-[10px] text-muted-foreground tabular-nums">{avgSpeed}</span>}
      </div>
      <Progress value={overallPercent} className="h-1" />
    </div>
  );
}
