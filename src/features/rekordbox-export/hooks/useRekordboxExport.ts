import { useState, useRef, useCallback, useEffect } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { TrackInfo, ExportResult, RekordboxExportProgressEvent, RekordboxExportStatus } from '@/bindings';
import { api, ApiError } from '@/lib/tauri';
import { toTrackCore } from '@/lib/trackMapping';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/features/settings/store';

type ExportPhase = 'idle' | 'confirm' | 'exporting' | 'complete' | 'error';

export interface TrackStatus {
  trackId: string;
  trackTitle: string;
  status: RekordboxExportStatus;
  error?: string;
}

interface ExportState {
  phase: ExportPhase;
  trackStatuses: Map<string, TrackStatus>;
  totalTracks: number;
  result: ExportResult | null;
  errorCode: string | null;
  error: string | null;
}

const INITIAL_STATE: ExportState = {
  phase: 'idle',
  trackStatuses: new Map(),
  totalTracks: 0,
  result: null,
  errorCode: null,
  error: null,
};

export function useRekordboxExport(tracks: TrackInfo[] | undefined, playlistName: string) {
  const [state, setState] = useState<ExportState>(INITIAL_STATE);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    return () => {
      unlistenRef.current?.();
    };
  }, []);

  const openConfirm = useCallback(() => {
    setState({ ...INITIAL_STATE, phase: 'confirm' });
  }, []);

  const close = useCallback(() => {
    unlistenRef.current?.();
    unlistenRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const startExport = useCallback(async () => {
    if (!tracks || tracks.length === 0) return;

    setState((s) => ({ ...s, phase: 'exporting', trackStatuses: new Map(), totalTracks: tracks.length }));

    const unlisten = await listen<RekordboxExportProgressEvent>('rekordbox-export-progress', (event) => {
      const p = event.payload;
      setState((s) => {
        const updated = new Map(s.trackStatuses);
        updated.set(p.trackId, {
          trackId: p.trackId,
          trackTitle: p.trackTitle,
          status: p.status,
          error: p.error ?? undefined,
        });
        return { ...s, trackStatuses: updated };
      });
    });
    unlistenRef.current = unlisten;

    const trackCores = tracks.map(toTrackCore);
    const maxConcurrent = useSettingsStore.getState().maxConcurrentDownloads;

    try {
      const result = await api.exportPlaylistToRekordbox(trackCores, playlistName, maxConcurrent);
      setState((s) => ({ ...s, phase: 'complete', result }));
    } catch (err: unknown) {
      const code = err instanceof ApiError ? err.code : null;
      const message = err instanceof Error ? err.message : String(err);
      void logger.error(`[rekordbox-export] Export failed: ${message}`);
      setState((s) => ({ ...s, phase: 'error', errorCode: code, error: message }));
    } finally {
      unlisten();
      unlistenRef.current = null;
    }
  }, [tracks, playlistName]);

  return {
    ...state,
    openConfirm,
    startExport,
    close,
  };
}
