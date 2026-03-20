import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useDownloadProgressListener } from './useDownloadProgressListener';
import { useDownloadState } from './useDownloadState';
import { useTrackDownloader } from './useTrackDownloader';
import type { TrackInfo, DownloadProgressEvent } from '@/bindings';
import type { DownloadState } from '@/types/download';

function toTrackCore(track: TrackInfo) {
  return {
    trackUrl: `https://api.soundcloud.com/tracks/${track.id}`,
    trackId: String(track.id),
    title: track.title,
    artist: track.user.username,
    artworkUrl: track.artwork_url ?? null,
    durationMs: track.duration,
    downloadUrl: track.download_url ?? null,
  };
}

function toDownloadState(state: { status: string; percent?: number; error?: { message: string } | null } | undefined): DownloadState {
  if (!state) return { status: 'idle' };
  
  switch (state.status) {
    case 'completed':
    case 'complete':
      return { status: 'completed' };
    case 'failed':
      return { status: 'error', error: state.error?.message ?? 'Unknown error' };
    case 'downloading':
      return { status: 'downloading', progress: state.percent ?? 0 };
    default:
      return { status: 'idle' };
  }
}

export function useTrackDownload(downloadPath: string) {
  const { t } = useTranslation();
  const { completedCount, updateFromEvent, getTrackState: getRawState, reconcile: rawReconcile } = useDownloadState();
  const { downloadTrack: download, getTrackInfo } = useTrackDownloader();
  
  const toastedRef = useRef<Set<string>>(new Set());
  const managedTracksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    toastedRef.current.clear();
    managedTracksRef.current.clear();
  }, [downloadPath]);

  const handleProgressEvent = useCallback((event: DownloadProgressEvent) => {
    if (!managedTracksRef.current.has(event.trackId)) return;

    updateFromEvent(event);

    if (event.status === 'complete' && !toastedRef.current.has(event.trackId)) {
      toastedRef.current.add(event.trackId);
      const info = getTrackInfo(event.trackId);
      if (info) {
        toast.success(t('search.toastSuccess', { title: info.title }));
      }
    } else if (event.status === 'failed' && !toastedRef.current.has(`err:${event.trackId}`)) {
      toastedRef.current.add(`err:${event.trackId}`);
      toast.error(t('search.toastError', { error: event.error?.message ?? 'Unknown error' }));
    }
  }, [updateFromEvent, getTrackInfo, t]);

  useDownloadProgressListener(handleProgressEvent);

  const downloadTrack = useCallback(async (track: TrackInfo) => {
    const trackId = String(track.id);
    managedTracksRef.current.add(trackId);
    toastedRef.current.delete(trackId);
    toastedRef.current.delete(`err:${trackId}`);

    updateFromEvent({
      trackId,
      status: 'downloading',
      percent: 0,
      downloadedBytes: null,
      totalBytes: null,
      error: null,
    });

    try {
      await download(toTrackCore(track), downloadPath);
    } catch (err) {
      const state = getRawState(trackId);
      if (state?.status === 'downloading') {
        const errorMsg = err instanceof Error ? err.message : 'Download failed';
        updateFromEvent({
          trackId,
          status: 'failed',
          percent: null,
          downloadedBytes: null,
          totalBytes: null,
          error: { code: 'DOWNLOAD_ERROR', message: errorMsg },
        });
        toast.error(t('search.toastError', { error: errorMsg }));
      }
    }
  }, [download, downloadPath, updateFromEvent, getRawState, t]);

  const getTrackState = useCallback((trackId: number): DownloadState => {
    return toDownloadState(getRawState(String(trackId)));
  }, [getRawState]);

  const reconcile = useCallback((diskIds: Set<number>) => {
    rawReconcile(Array.from(diskIds).map(String));
  }, [rawReconcile]);

  return { downloadTrack, getTrackState, completedCount, reconcile };
}
