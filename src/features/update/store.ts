import { create } from 'zustand';
import { commands, type UpdateInfo } from '@/bindings';

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

  installUpdate: async () => {
    if (get().installing) return;

    set({ installing: true, installError: null });
    console.log('[Update] Starting installation...');

    try {
      const result = await commands.installUpdate();

      if (result.status === 'ok') {
        console.log('[Update] Installation successful, restart required');
        set({ installing: false, installed: true });
      } else {
        console.log('[Update] Installation failed:', result.error);
        set({ installing: false, installError: result.error });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('[Update] Installation error:', message);
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
