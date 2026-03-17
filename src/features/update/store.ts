import { create } from 'zustand';
import { commands, type UpdateInfo } from '@/bindings';
import { useChangelogStore } from '@/features/changelog/store';
import { logger } from '@/lib/logger';

interface UpdateState {
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  checkInProgress: boolean;
  lastChecked: Date | null;
  dismissed: boolean;
  installing: boolean;
  installError: string | null;
  installed: boolean;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
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

    set({ installing: true, installError: null });
    void logger.info('[Update] Starting installation...');

    try {
      const result = await commands.installUpdate();

      if (result.status === 'ok') {
        void logger.info('[Update] Installation successful, restart required');
        set({ installing: false, installed: true });
      } else {
        void logger.error(`[Update] Installation failed: ${result.error}`);
        set({ installing: false, installError: result.error });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void logger.error(`[Update] Installation error: ${message}`);
      set({ installing: false, installError: message });
    }
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
