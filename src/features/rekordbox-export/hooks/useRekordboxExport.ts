import { useState, useEffect, useRef } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { TrackInfo, ExportResult, RekordboxExportProgressEvent } from '@/bindings';
import { api, ApiError } from '@/lib/tauri';
import { toTrackCore } from '@/lib/trackMapping';
import { logger } from '@/lib/logger';

type ExportPhase = 'idle' | 'confirm' | 'exporting' | 'complete' | 'error';

interface ExportState {
  phase: ExportPhase;
  progress: RekordboxExportProgressEvent | null;
  result: ExportResult | null;
  errorCode: string | null;
  error: string | null;
}

const INITIAL_STATE: ExportState = {
  phase: 'idle',
  progress: null,
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

  function openConfirm() {
    setState({ ...INITIAL_STATE, phase: 'confirm' });
  }

  function close() {
    unlistenRef.current?.();
    unlistenRef.current = null;
    setState(INITIAL_STATE);
  }

  async function startExport() {
    if (!tracks || tracks.length === 0) return;

    setState((s) => ({ ...s, phase: 'exporting', progress: null }));

    const unlisten = await listen<RekordboxExportProgressEvent>('rekordbox-export-progress', (event) => {
      setState((s) => ({ ...s, progress: event.payload }));
    });
    unlistenRef.current = unlisten;

    const trackCores = tracks.map(toTrackCore);

    try {
      const result = await api.exportPlaylistToRekordbox(trackCores, playlistName);
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
  }

  return {
    ...state,
    openConfirm,
    startExport,
    close,
  };
}
