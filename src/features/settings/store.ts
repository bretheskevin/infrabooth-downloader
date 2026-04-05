import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { logger } from '@/lib/logger';
import { clamp, getErrorString } from '@/lib/utils';

export type Theme = 'system' | 'light' | 'dark';

interface SettingsState {
  downloadPath: string;
  language: 'en' | 'fr';
  theme: Theme;
  maxConcurrentDownloads: number;
  preservePlaylistOrder: boolean;
  playerVolume: number;
  streamMode: boolean;
  crossfadeEnabled: boolean;
  crossfadeDuration: number;
  hideReposts: boolean;
  hideReleasesReposts: boolean;
  _hasHydrated: boolean;
  setDownloadPath: (path: string) => void;
  setLanguage: (lang: 'en' | 'fr') => void;
  setTheme: (theme: Theme) => void;
  setMaxConcurrentDownloads: (n: number) => void;
  setPreservePlaylistOrder: (value: boolean) => void;
  setPlayerVolume: (volume: number) => void;
  setStreamMode: (value: boolean) => void;
  setCrossfadeEnabled: (value: boolean) => void;
  setCrossfadeDuration: (value: number) => void;
  setHideReposts: (value: boolean) => void;
  setHideReleasesReposts: (value: boolean) => void;
  _setHasHydrated: (state: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      downloadPath: '',
      language: 'en',
      theme: 'system',
      maxConcurrentDownloads: 3,
      preservePlaylistOrder: true,
      playerVolume: 1.0,
      streamMode: false,
      crossfadeEnabled: false,
      crossfadeDuration: 5,
      hideReposts: false,
      hideReleasesReposts: false,
      _hasHydrated: false,
      setDownloadPath: (path) => set({ downloadPath: path }),
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme }),
      setMaxConcurrentDownloads: (n) => set({ maxConcurrentDownloads: clamp(n, 1, 10) }),
      setPreservePlaylistOrder: (value) => set({ preservePlaylistOrder: value }),
      setPlayerVolume: (volume) => set({ playerVolume: clamp(volume, 0, 1) }),
      setStreamMode: (value) => set({ streamMode: value }),
      setCrossfadeEnabled: (value) => set({ crossfadeEnabled: value }),
      setCrossfadeDuration: (value) => set({ crossfadeDuration: clamp(value, 1, 12) }),
      setHideReposts: (value) => set({ hideReposts: value }),
      setHideReleasesReposts: (value) => set({ hideReleasesReposts: value }),
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
        streamMode: state.streamMode,
        crossfadeEnabled: state.crossfadeEnabled,
        crossfadeDuration: state.crossfadeDuration,
        hideReposts: state.hideReposts,
        hideReleasesReposts: state.hideReleasesReposts,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          void logger.error(`Settings hydration error: ${getErrorString(error)}`);
        }
        state?._setHasHydrated(true);
      },
    }
  )
);

export const useSettingsHydrated = () =>
  useSettingsStore((state) => state._hasHydrated);
