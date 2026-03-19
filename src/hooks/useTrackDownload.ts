import { useCallback, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { downloadTrack as downloadTrackApi } from '@/features/queue/api/download';
import type { TrackInfo } from '@/bindings';
import type { DownloadProgressEvent } from '@/types/events';
import type { DownloadState } from '@/types/download';

interface TrackDownloadInternalState {
  map: Map<string, DownloadState>;
  completedCount: number;
}

const EMPTY_STATE: TrackDownloadInternalState = { map: new Map(), completedCount: 0 };

/** Return +1 / -1 / 0 to adjust completedCount when transitioning between states. */
function completedDelta(prev: DownloadState | undefined, next: DownloadState): number {
  const was = prev?.status === 'completed' ? 1 : 0;
  const is = next.status === 'completed' ? 1 : 0;
  return is - was;
}

export function useTrackDownload(downloadPath: string) {
  const { t } = useTranslation();
  const [{ map: trackStates, completedCount }, setState] = useState(EMPTY_STATE);
  const trackInfoRef = useRef<Map<string, TrackInfo>>(new Map());
  const toastedRef = useRef<Set<string>>(new Set());

  // Reset all state when download path changes so stale "completed" marks don't persist
  useEffect(() => {
    setState(EMPTY_STATE);
    trackInfoRef.current.clear();
    toastedRef.current.clear();
  }, [downloadPath]);

  useEffect(() => {
    const unlisten = listen<DownloadProgressEvent>('download-progress', (event) => {
      const { trackId, status, percent, downloadedBytes, totalBytes, error } = event.payload;

      // Only process events for tracks we're managing
      if (!trackInfoRef.current.has(trackId)) return;

      if (status === 'complete') {
        setState((prev) => {
          const next = new Map(prev.map);
          const newState: DownloadState = { status: 'completed' };
          const delta = completedDelta(prev.map.get(trackId), newState);
          next.set(trackId, newState);
          return { map: next, completedCount: prev.completedCount + delta };
        });
        if (!toastedRef.current.has(trackId)) {
          toastedRef.current.add(trackId);
          const track = trackInfoRef.current.get(trackId);
          if (track) {
            toast.success(t('search.toastSuccess', { title: track.title }));
          }
        }
      } else if (status === 'failed') {
        const errorMsg = error?.message ?? 'Unknown error';
        setState((prev) => {
          const next = new Map(prev.map);
          const newState: DownloadState = { status: 'error', error: errorMsg };
          const delta = completedDelta(prev.map.get(trackId), newState);
          next.set(trackId, newState);
          return { map: next, completedCount: prev.completedCount + delta };
        });
        if (!toastedRef.current.has(`err:${trackId}`)) {
          toastedRef.current.add(`err:${trackId}`);
          toast.error(t('search.toastError', { error: errorMsg }));
        }
      } else if (percent != null) {
        setState((prev) => {
          const next = new Map(prev.map);
          const current = prev.map.get(trackId);
          const newState: DownloadState = {
            status: 'downloading',
            progress: percent,
            downloadedBytes: downloadedBytes ?? current?.downloadedBytes,
            totalBytes: Math.max(totalBytes ?? 0, current?.totalBytes ?? 0) || undefined,
          };
          const delta = completedDelta(current, newState);
          next.set(trackId, newState);
          return { map: next, completedCount: prev.completedCount + delta };
        });
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [t]);

  const downloadTrack = useCallback(
    async (track: TrackInfo) => {
      const trackId = String(track.id);
      trackInfoRef.current.set(trackId, track);
      toastedRef.current.delete(trackId);
      toastedRef.current.delete(`err:${trackId}`);

      setState((prev) => {
        const next = new Map(prev.map);
        const newState: DownloadState = { status: 'downloading', progress: 0 };
        const delta = completedDelta(prev.map.get(trackId), newState);
        next.set(trackId, newState);
        return { map: next, completedCount: prev.completedCount + delta };
      });

      try {
        await downloadTrackApi({
          trackUrl: `https://api.soundcloud.com/tracks/${track.id}`,
          trackId,
          title: track.title,
          artist: track.user.username,
          album: null,
          trackNumber: null,
          totalTracks: null,
          artworkUrl: track.artwork_url ?? null,
          outputDir: downloadPath,
          durationMs: track.duration,
          downloadUrl: track.download_url ?? null,
        });
      } catch (err) {
        setState((prev) => {
          const current = prev.map.get(trackId);
          // Only set error if not already set by event listener
          if (current?.status === 'downloading') {
            const next = new Map(prev.map);
            const errorMsg = err instanceof Error ? err.message : 'Download failed';
            const newState: DownloadState = { status: 'error', error: errorMsg };
            const delta = completedDelta(current, newState);
            next.set(trackId, newState);
            toast.error(t('search.toastError', { error: errorMsg }));
            return { map: next, completedCount: prev.completedCount + delta };
          }
          return prev;
        });
      }
    },
    [downloadPath, t],
  );

  const getTrackState = useCallback(
    (trackId: number): DownloadState => {
      return trackStates.get(String(trackId)) ?? { status: 'idle' };
    },
    [trackStates],
  );

  /** Clear stale 'completed' entries not confirmed by a filesystem scan. */
  const reconcile = useCallback((diskIds: Set<number>) => {
    setState((prev) => {
      let removedCompleted = 0;
      const next = new Map(prev.map);
      for (const [key, state] of next) {
        if (state.status === 'completed' && !diskIds.has(Number(key))) {
          next.delete(key);
          removedCompleted++;
        }
      }
      if (removedCompleted === 0) return prev;
      return { map: next, completedCount: prev.completedCount - removedCompleted };
    });
  }, []);

  return { downloadTrack, getTrackState, completedCount, reconcile };
}
