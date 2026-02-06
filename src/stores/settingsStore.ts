import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  downloadPath: string;
  language: 'en' | 'fr';
  // Actions
  setDownloadPath: (path: string) => void;
  setLanguage: (lang: 'en' | 'fr') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      downloadPath: '',
      language: 'en',
      setDownloadPath: (path) => set({ downloadPath: path }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'settings-storage',
    }
  )
);
