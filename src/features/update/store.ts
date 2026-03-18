import { create } from 'zustand';
import { relaunch } from '@tauri-apps/plugin-process';
import { listen } from '@tauri-apps/api/event';
import { commands, type UpdateInfo } from '@/bindings';
import { useChangelogStore } from '@/features/changelog/store';
import { logger } from '@/lib/logger';

interface UpdateDownloadProgress {
  downloadedBytes: number;
  totalBytes: number | null;
}

interface UpdateState {
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  checkInProgress: boolean;
  lastChecked: Date | null;
  dismissed: boolean;
  installing: boolean;
  installError: string | null;
  installed: boolean;
  downloadProgress: UpdateDownloadProgress | null;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  relaunchApp: () => Promise<void>;
  dismissUpdate: () => void;
  clearUpdateInfo: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateAvailable: false,
  updateInfo: null,
  checkInProgress: false,
  lastChecked: null,
  dismissed: false,
  installing: false,
  installError: null,
  installed: false,
  downloadProgress: null,

  checkForUpdates: async () => {
    if (get().checkInProgress) return;

    set({ checkInProgress: true });
    void logger.info('[Update] Checking for updates...');

    try {
      const result = await commands.checkForUpdates();

      if (result.status === 'ok' && result.data) {
        void logger.info(`[Update] New version available: ${result.data.version}`);
        useChangelogStore.getState().cacheChangelog(result.data.body ?? null, result.data.date ?? null);
        set({
          updateAvailable: true,
          updateInfo: result.data,
          checkInProgress: false,
          lastChecked: new Date(),
        });
      } else {
        void logger.info('[Update] App is up to date');
        set({
          updateAvailable: false,
          updateInfo: null,
          checkInProgress: false,
          lastChecked: new Date(),
        });
      }
    } catch (error) {
      // Silent failure — log but don't show to user (FR27)
      void logger.warn(`[Update] Check failed: ${error instanceof Error ? error.message : String(error)}`);
      set({
        updateAvailable: false,
        updateInfo: null,
        checkInProgress: false,
        lastChecked: new Date(),
      });
    }
  },

  installUpdate: async () => {
    if (get().installing) return;

    set({ installing: true, installError: null, downloadProgress: null });
    void logger.info('[Update] Starting installation...');

    try {
      const result = await commands.installUpdate();

      if (result.status === 'ok') {
        void logger.info('[Update] Installation successful, restart required');
        set({ installing: false, installed: true, downloadProgress: null });
      } else {
        void logger.error(`[Update] Installation failed: ${result.error}`);
        set({ installing: false, installError: result.error, downloadProgress: null });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void logger.error(`[Update] Installation error: ${message}`);
      set({ installing: false, installError: message, downloadProgress: null });
    }
  },

  relaunchApp: async () => {
    void logger.info('[Update] Relaunching app to apply update...');
    await relaunch();
  },

  dismissUpdate: () => {
    set({ dismissed: true });
  },

  clearUpdateInfo: () => {
    set({
      updateAvailable: false,
      updateInfo: null,
      dismissed: false,
    });
  },
}));

// Set up event listener for update download progress
listen<UpdateDownloadProgress>('update-download-progress', (event) => {
  useUpdateStore.setState({ downloadProgress: event.payload });
});
