import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EqualizerPreset } from '@/bindings';
import { logger } from '@/lib/logger';
import { getErrorString } from '@/lib/utils';
import { makeSetter, makeClampedSetter, pickKeys } from './helpers';
import { EQUALIZER_BAND_FREQUENCIES, clampGain, isBuiltInPreset, matchPreset, presetGains, sanitizeGains } from './utils/equalizerPresets';

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
  equalizerEnabled: boolean;
  equalizerPreset: EqualizerPreset;
  equalizerGains: number[];
  hideReposts: boolean;
  hideReleasesReposts: boolean;
  mediaViewMode: MediaViewMode;
  playlistDownloadPaths: Record<string, string>;
  remoteControlEnabled: boolean;
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
  setEqualizerEnabled: (value: boolean) => void;
  setEqualizerPreset: (preset: EqualizerPreset) => void;
  setEqualizerBandGain: (index: number, db: number) => void;
  resetEqualizer: () => void;
  setHideReposts: (value: boolean) => void;
  setHideReleasesReposts: (value: boolean) => void;
  setMediaViewMode: (mode: MediaViewMode) => void;
  setRemoteControlEnabled: (value: boolean) => void;
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
  'equalizerEnabled',
  'equalizerPreset',
  'equalizerGains',
  'hideReposts',
  'hideReleasesReposts',
  'mediaViewMode',
  'playlistDownloadPaths',
  'remoteControlEnabled',
] as const satisfies readonly (keyof SettingsState)[];

function sanitizeEqualizer(state: SettingsState): SettingsState {
  const equalizerEnabled = state.equalizerEnabled === true;
  const gains = sanitizeGains(state.equalizerGains);
  if (gains) return { ...state, equalizerEnabled, equalizerGains: gains, equalizerPreset: matchPreset(gains) };
  const fallback = isBuiltInPreset(state.equalizerPreset) ? state.equalizerPreset : 'flat';
  void logger.warn(
    `[settings] Persisted equalizer gains do not fit ${EQUALIZER_BAND_FREQUENCIES.length} bands, falling back to preset "${fallback}" (stored preset ${JSON.stringify(state.equalizerPreset)}, gains ${JSON.stringify(state.equalizerGains)})`,
  );
  return { ...state, equalizerEnabled, equalizerGains: presetGains(fallback), equalizerPreset: fallback };
}

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
      equalizerEnabled: false,
      equalizerPreset: 'flat',
      equalizerGains: presetGains('flat'),
      hideReposts: false,
      hideReleasesReposts: false,
      mediaViewMode: 'card',
      playlistDownloadPaths: {},
      remoteControlEnabled: false,
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
      setEqualizerEnabled: makeSetter('equalizerEnabled', set),
      setEqualizerPreset: (preset) => {
        if (preset === 'custom') return;
        set({ equalizerPreset: preset, equalizerGains: presetGains(preset) });
      },
      setEqualizerBandGain: (index, db) =>
        set((state) => {
          if (!Number.isInteger(index) || index < 0 || index >= state.equalizerGains.length) return state;
          const equalizerGains = state.equalizerGains.map((gain, i) => (i === index ? clampGain(db) : gain));
          return { equalizerGains, equalizerPreset: matchPreset(equalizerGains) };
        }),
      resetEqualizer: () => set({ equalizerPreset: 'flat', equalizerGains: presetGains('flat') }),
      setHideReposts: makeSetter('hideReposts', set),
      setHideReleasesReposts: makeSetter('hideReleasesReposts', set),
      setMediaViewMode: makeSetter('mediaViewMode', set),
      setRemoteControlEnabled: makeSetter('remoteControlEnabled', set),
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
      merge: (persisted, current) => sanitizeEqualizer({ ...current, ...(persisted as Partial<SettingsState>) }),
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
