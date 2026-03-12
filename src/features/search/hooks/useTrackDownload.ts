import { useCallback, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { downloadTrack as downloadTrackApi } from '@/features/queue/api/download';
import type { TrackInfo } from '@/bindings';
import type { DownloadProgressEvent } from '@/types/events';
import type { DownloadState } from '../types';

export function useTrackDownload(downloadPath: string) {
  const { t } = useTranslation();
  const [trackStates, setTrackStates] = useState<Map<string, DownloadState>>(new Map());
  const trackInfoRef = useRef<Map<string, TrackInfo>>(new Map());
  const toastedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unlisten = listen<DownloadProgressEvent>('download-progress', (event) => {
      const { trackId, status, percent, downloadedBytes, totalBytes, error } = event.payload;

      // Only process events for tracks we're managing
      if (!trackInfoRef.current.has(trackId)) return;

      if (status === 'complete') {
        setTrackStates((prev) => {
          const next = new Map(prev);
          next.set(trackId, { status: 'completed' });
          return next;
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
        setTrackStates((prev) => {
          const next = new Map(prev);
          next.set(trackId, { status: 'error', error: errorMsg });
          return next;
        });
        if (!toastedRef.current.has(`err:${trackId}`)) {
          toastedRef.current.add(`err:${trackId}`);
          toast.error(t('search.toastError', { error: errorMsg }));
        }
      } else if (percent != null) {
        setTrackStates((prev) => {
          const next = new Map(prev);
          const current = next.get(trackId);
          next.set(trackId, {
            status: 'downloading',
            progress: percent,
            downloadedBytes: downloadedBytes ?? current?.downloadedBytes,
            totalBytes: Math.max(totalBytes ?? 0, current?.totalBytes ?? 0) || undefined,
          });
          return next;
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

      setTrackStates((prev) => {
        const next = new Map(prev);
        next.set(trackId, { status: 'downloading', progress: 0 });
        return next;
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
        });
      } catch (err) {
        // Error events are already handled by the listener above.
        // But if the command itself throws (before events are emitted),
        // we still need to update state.
        setTrackStates((prev) => {
          const next = new Map(prev);
          const current = next.get(trackId);
          // Only set error if not already set by event listener
          if (current?.status === 'downloading') {
            const errorMsg = err instanceof Error ? err.message : 'Download failed';
            next.set(trackId, { status: 'error', error: errorMsg });
            toast.error(t('search.toastError', { error: errorMsg }));
          }
          return next;
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

  return { downloadTrack, getTrackState };
}
