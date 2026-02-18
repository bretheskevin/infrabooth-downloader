import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Application theme preference */
export type Theme = 'system' | 'light' | 'dark';

interface SettingsState {
  downloadPath: string;
  language: 'en' | 'fr';
  theme: Theme;
  _hasHydrated: boolean;
  // Actions
  setDownloadPath: (path: string) => void;
  setLanguage: (lang: 'en' | 'fr') => void;
  setTheme: (theme: Theme) => void;
  _setHasHydrated: (state: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      downloadPath: '',
      language: 'en',
      theme: 'system' as Theme,
      _hasHydrated: false,
      setDownloadPath: (path) => set({ downloadPath: path }),
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme }),
      _setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'sc-downloader-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        downloadPath: state.downloadPath,
        language: state.language,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Settings hydration error:', error);
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
