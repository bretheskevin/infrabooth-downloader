import { useCallback } from 'react';
import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import type { DownloadProgressEvent, ErrorResponse } from '@/bindings';

interface TrackDownloadState {
  status: string;
  percent?: number;
  error?: ErrorResponse | null;
}

interface DownloadStateStore {
  states: Map<string, TrackDownloadState>;
  completedCount: number;
}

export const useDownloadStateStore = create<DownloadStateStore>(() => ({
  states: new Map(),
  completedCount: 0,
}));

const managedTrackIds = new Set<string>();

export function addManagedTrack(trackId: string) {
  managedTrackIds.add(trackId);
}

export function clearManagedTracks() {
  managedTrackIds.clear();
}

function processEvent(event: DownloadProgressEvent) {
  if (!managedTrackIds.has(event.trackId)) return;

  useDownloadStateStore.setState((prev) => {
    const newMap = new Map(prev.states);
    const existing = newMap.get(event.trackId);

    newMap.set(event.trackId, {
      status: event.status,
      percent: event.percent ?? existing?.percent,
      error: event.error,
    });

    const wasComplete = existing?.status === 'complete' || existing?.status === 'completed';
    const isComplete = event.status === 'complete' || event.status === 'completed';
    const newCompleted = isComplete && !wasComplete
      ? prev.completedCount + 1
      : prev.completedCount;

    return { states: newMap, completedCount: newCompleted };
  });
}

let listenerInitialized = false;
let unlistenFn: (() => void) | undefined;

function initGlobalListener() {
  if (listenerInitialized) return;
  listenerInitialized = true;
  void listen<DownloadProgressEvent>('download-progress', (event) => {
    processEvent(event.payload);
  }).then((unlisten) => {
    unlistenFn = unlisten;
  });
}
initGlobalListener();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unlistenFn?.();
    listenerInitialized = false;
  });
}

export function useDownloadState() {
  const { states, completedCount } = useDownloadStateStore();

  const updateFromEvent = useCallback((event: DownloadProgressEvent) => {
    addManagedTrack(event.trackId);
    processEvent(event);
  }, []);

  const getTrackState = useCallback(
    (trackId: string) => states.get(trackId),
    [states],
  );

  const reconcile = useCallback((trackIds: string[]) => {
    useDownloadStateStore.setState((prev) => {
      const diskSet = new Set(trackIds);
      const newMap = new Map<string, TrackDownloadState>();
      for (const [id, state] of prev.states) {
        const isCompleted = state.status === 'complete' || state.status === 'completed';
        if (diskSet.has(id) || !isCompleted) {
          newMap.set(id, state);
        }
      }
      return { ...prev, states: newMap };
    });
  }, []);

  return { completedCount, updateFromEvent, getTrackState, reconcile };
}
