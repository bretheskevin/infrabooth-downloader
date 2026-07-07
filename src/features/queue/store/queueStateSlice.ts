import type { StateCreator } from 'zustand';
import { logger } from '@/lib/logger';
import type { QueueState, QueueStateSlice } from './types';
import { INITIAL_QUEUE_STATE } from './types';

export const createQueueStateSlice: StateCreator<QueueState, [], [], QueueStateSlice> = (set) => ({
  tracks: [],
  currentIndex: 0,
  totalTracks: 0,
  isProcessing: false,
  isInitializing: false,
  outputDir: null,
  batchTitle: null,

  enqueueTracks: (tracks) => {
    void logger.info(`[queueStore] Enqueueing ${tracks.length} tracks`);
    set({
      ...INITIAL_QUEUE_STATE,
      tracks,
      totalTracks: tracks.length,
    });
  },

  updateTrackStatus: (id, status, error, progress) => {
    void logger.debug(`[queueStore] Track ${id} status: ${status}${error ? ` (error: ${error.code})` : ''}`);
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === id
          ? {
              ...track,
              status,
              error,
              percent: progress?.percent ?? track.percent,
              downloadedBytes: progress?.downloadedBytes ?? track.downloadedBytes,
              totalBytes: Math.max(progress?.totalBytes ?? 0, track.totalBytes ?? 0) || undefined,
              filePath: progress?.filePath ?? track.filePath,
            }
          : track,
      ),
    }));
  },

  clearQueue: () => {
    void logger.info('[queueStore] Clearing queue');
    set({
      tracks: [],
      totalTracks: 0,
      ...INITIAL_QUEUE_STATE,
    });
  },

  setInitializing: (isInitializing) => {
    void logger.debug(`[queueStore] Initializing: ${isInitializing}`);
    set({ isInitializing });
  },

  setOutputDir: (path) => {
    void logger.debug(`[queueStore] Output dir: ${path || 'default'}`);
    set({ outputDir: path });
  },

  setBatchTitle: (title) => {
    void logger.debug(`[queueStore] Batch title: ${title ?? 'null'}`);
    set({ batchTitle: title });
  },
});
