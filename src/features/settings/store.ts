import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { logger } from '@/lib/logger';
import { getErrorString } from '@/lib/utils';
import { makeSetter, makeClampedSetter, pickKeys } from './helpers';

export type Theme = 'system' | 'light' | 'dark';
export type MediaViewMode = 'card' | 'list';

interface SettingsState {
  downloadPath: string;
  rekordboxPathOverride: string;
  rekordboxDefaultExportFolderId: string | null;
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
  mediaViewMode: MediaViewMode;
  playlistDownloadPaths: Record<string, string>;
  _hasHydrated: boolean;
  setDownloadPath: (path: string) => void;
  setRekordboxPathOverride: (path: string) => void;
  setRekordboxDefaultExportFolderId: (id: string | null) => void;
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
  setMediaViewMode: (mode: MediaViewMode) => void;
  setPlaylistDownloadPath: (playlistId: string, path: string) => void;
  _setHasHydrated: (state: boolean) => void;
}

const PERSISTED_KEYS = [
  'downloadPath',
  'rekordboxPathOverride',
  'rekordboxDefaultExportFolderId',
  'language',
  'theme',
  'maxConcurrentDownloads',
  'preservePlaylistOrder',
  'playerVolume',
  'streamMode',
  'crossfadeEnabled',
  'crossfadeDuration',
  'hideReposts',
  'hideReleasesReposts',
  'mediaViewMode',
  'playlistDownloadPaths',
] as const satisfies readonly (keyof SettingsState)[];

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      downloadPath: '',
      rekordboxPathOverride: '',
      rekordboxDefaultExportFolderId: null,
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
      mediaViewMode: 'card',
      playlistDownloadPaths: {},
      _hasHydrated: false,
      setDownloadPath: makeSetter('downloadPath', set),
      setRekordboxPathOverride: makeSetter('rekordboxPathOverride', set),
      setRekordboxDefaultExportFolderId: makeSetter('rekordboxDefaultExportFolderId', set),
      setLanguage: makeSetter('language', set),
      setTheme: makeSetter('theme', set),
      setMaxConcurrentDownloads: makeClampedSetter('maxConcurrentDownloads', set, 1, 10),
      setPreservePlaylistOrder: makeSetter('preservePlaylistOrder', set),
      setPlayerVolume: makeClampedSetter('playerVolume', set, 0, 1),
      setStreamMode: makeSetter('streamMode', set),
      setCrossfadeEnabled: makeSetter('crossfadeEnabled', set),
      setCrossfadeDuration: makeClampedSetter('crossfadeDuration', set, 1, 12),
      setHideReposts: makeSetter('hideReposts', set),
      setHideReleasesReposts: makeSetter('hideReleasesReposts', set),
      setMediaViewMode: makeSetter('mediaViewMode', set),
      setPlaylistDownloadPath: (playlistId, path) =>
        set((state) => ({
          playlistDownloadPaths: { ...state.playlistDownloadPaths, [playlistId]: path },
        })),
      _setHasHydrated: makeSetter('_hasHydrated', set),
    }),
    {
      name: 'sc-downloader-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => pickKeys(state, PERSISTED_KEYS),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          void logger.error(`Settings hydration error: ${getErrorString(error)}`);
        }
        state?._setHasHydrated(true);
      },
    },
  ),
);

export const useSettingsHydrated = () => useSettingsStore((state) => state._hasHydrated);
