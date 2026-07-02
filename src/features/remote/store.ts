import { create } from 'zustand';
import { commands, type RemoteServerInfo } from '@/bindings';
import { logger } from '@/lib/logger';

interface RemoteStore {
  serverInfo: RemoteServerInfo | null;
  starting: boolean;
  downloadingTrackIds: number[];
  downloadedTrackIds: number[];
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  markDownloading: (trackId: number) => void;
  clearDownloading: (trackId: number) => void;
  markDownloaded: (trackId: number) => void;
}

export const useRemoteStore = create<RemoteStore>()((set, get) => ({
  serverInfo: null,
  starting: false,
  downloadingTrackIds: [],
  downloadedTrackIds: [],
  markDownloading: (trackId) =>
    set((s) => (s.downloadingTrackIds.includes(trackId) ? s : { downloadingTrackIds: [...s.downloadingTrackIds, trackId] })),
  clearDownloading: (trackId) => set((s) => ({ downloadingTrackIds: s.downloadingTrackIds.filter((id) => id !== trackId) })),
  markDownloaded: (trackId) =>
    set((s) => (s.downloadedTrackIds.includes(trackId) ? s : { downloadedTrackIds: [...s.downloadedTrackIds, trackId] })),
  enable: async () => {
    if (get().starting || get().serverInfo) return;
    set({ starting: true });
    const result = await commands.startRemoteServer();
    if (result.status === 'ok') {
      set({ serverInfo: result.data, starting: false });
      void logger.info(`[remote] Server started on port ${result.data.port}`);
    } else {
      set({ starting: false });
      void logger.error(`[remote] Failed to start server: ${result.error.message}`);
      throw new Error(result.error.message);
    }
  },
  disable: async () => {
    const result = await commands.stopRemoteServer();
    if (result.status === 'error') {
      void logger.error(`[remote] Failed to stop server: ${result.error.message}`);
    }
    set({ serverInfo: null });
  },
}));
