import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useDownloadState, useDownloadStateStore, addManagedTrack, clearManagedTracks } from './useDownloadState';
import { useTrackDownloader } from './useTrackDownloader';
import type { TrackInfo } from '@/bindings';
import type { DownloadState } from '@/types/download';
import { toTrackCore } from '@/lib/trackMapping';

export function toDownloadState(state: { status: string; percent?: number; error?: { message: string } | null } | undefined): DownloadState {
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

  useEffect(() => {
    toastedRef.current.clear();
    clearManagedTracks();
  }, [downloadPath]);

  useEffect(() => {
    const unsub = useDownloadStateStore.subscribe((state, prevState) => {
      for (const [trackId, trackState] of state.states) {
        const prevStatus = prevState.states.get(trackId)?.status;

        if (trackState.status === 'complete' && prevStatus !== 'complete'
            && !toastedRef.current.has(trackId)) {
          toastedRef.current.add(trackId);
          const info = getTrackInfo(trackId);
          if (info) {
            toast.success(t('search.toastSuccess', { title: info.title }));
          }
        } else if (trackState.status === 'failed' && prevStatus !== 'failed'
            && !toastedRef.current.has(`err:${trackId}`)) {
          toastedRef.current.add(`err:${trackId}`);
          toast.error(t('search.toastError', { error: trackState.error?.message ?? t('errors.unknownError') }));
        }
      }
    });
    return unsub;
  }, [t, getTrackInfo]);

  const downloadTrack = useCallback(async (track: TrackInfo) => {
    const trackId = String(track.id);
    addManagedTrack(trackId);
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
      }
    }
  }, [download, downloadPath, updateFromEvent, getRawState]);

  const getTrackState = useCallback((trackId: number): DownloadState => {
    return toDownloadState(getRawState(String(trackId)));
  }, [getRawState]);

  const reconcile = useCallback((diskIds: Set<number>) => {
    rawReconcile(Array.from(diskIds).map(String));
  }, [rawReconcile]);

  return { downloadTrack, getTrackState, completedCount, reconcile };
}
