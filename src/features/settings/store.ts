import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { logger } from '@/lib/logger';

/** Application theme preference */
export type Theme = 'system' | 'light' | 'dark';

interface SettingsState {
  downloadPath: string;
  language: 'en' | 'fr';
  theme: Theme;
  maxConcurrentDownloads: number;
  preservePlaylistOrder: boolean;
  playerVolume: number;
  _hasHydrated: boolean;
  // Actions
  setDownloadPath: (path: string) => void;
  setLanguage: (lang: 'en' | 'fr') => void;
  setTheme: (theme: Theme) => void;
  setMaxConcurrentDownloads: (n: number) => void;
  setPreservePlaylistOrder: (value: boolean) => void;
  setPlayerVolume: (volume: number) => void;
  _setHasHydrated: (state: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      downloadPath: '',
      language: 'en',
      theme: 'system' as Theme,
      maxConcurrentDownloads: 3,
      preservePlaylistOrder: true,
      playerVolume: 1.0,
      _hasHydrated: false,
      setDownloadPath: (path) => set({ downloadPath: path }),
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme }),
      setMaxConcurrentDownloads: (n) => set({ maxConcurrentDownloads: Math.min(10, Math.max(1, n)) }),
      setPreservePlaylistOrder: (value) => set({ preservePlaylistOrder: value }),
      setPlayerVolume: (volume) => set({ playerVolume: Math.min(1, Math.max(0, volume)) }),
      _setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'sc-downloader-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        downloadPath: state.downloadPath,
        language: state.language,
        theme: state.theme,
        maxConcurrentDownloads: state.maxConcurrentDownloads,
        preservePlaylistOrder: state.preservePlaylistOrder,
        playerVolume: state.playerVolume,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          void logger.error(`Settings hydration error: ${error instanceof Error ? error.message : String(error)}`);
        }
        // Mark as hydrated regardless of error
        state?._setHasHydrated(true);
      },
    }
  )
);

// Selector for hydration status
export const useSettingsHydrated = () =>
  useSettingsStore((state) => state._hasHydrated);
