import { create } from 'zustand';
import { commands, type UpdateInfo } from '@/bindings';

interface UpdateState {
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  checkInProgress: boolean;
  lastChecked: Date | null;
  dismissed: boolean;
  checkForUpdates: () => Promise<void>;
  dismissUpdate: () => void;
  clearUpdateInfo: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateAvailable: false,
  updateInfo: null,
  checkInProgress: false,
  lastChecked: null,
  dismissed: false,

  checkForUpdates: async () => {
    if (get().checkInProgress) return;

    set({ checkInProgress: true });
    console.log('[Update] Checking for updates...');

    try {
      const result = await commands.checkForUpdates();

      if (result.status === 'ok' && result.data) {
        console.log(`[Update] New version available: ${result.data.version}`);
        set({
          updateAvailable: true,
          updateInfo: result.data,
          checkInProgress: false,
          lastChecked: new Date(),
        });
      } else {
        console.log('[Update] App is up to date');
        set({
          updateAvailable: false,
          updateInfo: null,
          checkInProgress: false,
          lastChecked: new Date(),
        });
      }
    } catch (error) {
      // Silent failure — log but don't show to user (FR27)
      console.log('[Update] Check failed:', error);
      set({
        updateAvailable: false,
        updateInfo: null,
        checkInProgress: false,
        lastChecked: new Date(),
      });
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
