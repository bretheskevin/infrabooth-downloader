import { commands, type DockMenuLabels, type DockMenuSettings, type DockMenuState, type DockSettingAction } from '@/bindings';
import { useSettingsStore } from '@/features/settings/store';
import i18n from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { sendPlayerCommand } from '../player-commands';
import { usePlayerStore } from '../store';
import type { PlaybackItem, PlaybackState } from '../types';

export const DOCK_SETTING_EVENT = 'dock-setting';
const CROSSFADE_SECONDS = Array.from({ length: 12 }, (_, i) => i + 1);

type Translate = (key: string, options?: { count: number }) => string;

export interface DockMenuSource {
  currentTrack: PlaybackItem | null;
  state: PlaybackState;
  isShuffled: boolean;
}

export interface DockSettingTarget {
  setCrossfadeEnabled: (value: boolean) => void;
  setCrossfadeDuration: (value: number) => void;
  setMaxConcurrentDownloads: (n: number) => void;
}

function toDockMenuLabels(t: Translate): DockMenuLabels {
  return {
    play: t('player.play'),
    pause: t('player.pause'),
    next: t('player.next'),
    previous: t('player.previous'),
    shuffle: t('player.shuffle'),
    notPlaying: t('player.notPlaying'),
    settingsMenu: t('settings.title'),
    crossfade: t('settings.crossfade'),
    crossfadeDuration: t('player.dockCrossfadeDuration'),
    crossfadeSeconds: CROSSFADE_SECONDS.map((count) => t('settings.crossfadeSeconds', { count })),
    parallelDownloads: t('player.dockParallelDownloads'),
    sequential: t('player.dockSequential'),
  };
}

function toDockMenuSettings({ crossfadeEnabled, crossfadeDuration, maxConcurrentDownloads }: DockMenuSettings): DockMenuSettings {
  return {
    crossfadeEnabled,
    crossfadeDuration: Math.round(crossfadeDuration),
    maxConcurrentDownloads: Math.round(maxConcurrentDownloads),
  };
}

export function toDockMenuState(
  { currentTrack, state, isShuffled }: DockMenuSource,
  settings: DockMenuSettings,
  t: Translate,
): DockMenuState {
  return {
    title: currentTrack ? `${currentTrack.title} — ${currentTrack.artist}` : null,
    isPlaying: state === 'playing' || state === 'loading',
    hasTrack: currentTrack !== null,
    shuffle: isShuffled,
    settings: toDockMenuSettings(settings),
    labels: toDockMenuLabels(t),
  };
}

export function handleDockSetting(action: DockSettingAction, target: DockSettingTarget): void {
  void logger.info(`[dock-menu] Setting action: ${JSON.stringify(action)}`);
  switch (action.type) {
    case 'setCrossfade':
      target.setCrossfadeEnabled(action.enabled);
      return;
    case 'setCrossfadeDuration':
      target.setCrossfadeDuration(action.seconds);
      return;
    case 'setMaxConcurrentDownloads':
      target.setMaxConcurrentDownloads(action.count);
      return;
  }
}

let lastSentKey: string | null = null;

function syncDockMenu(): void {
  const { currentTrack, state, isShuffled } = usePlayerStore.getState();
  const dockState = toDockMenuState({ currentTrack, state, isShuffled }, useSettingsStore.getState(), (key, options) =>
    i18n.t(key, options),
  );
  const key = JSON.stringify(dockState);
  if (key === lastSentKey) return;
  lastSentKey = key;
  const { crossfadeEnabled, crossfadeDuration, maxConcurrentDownloads } = dockState.settings;
  void logger.debug(
    `[dock-menu] Sync: track=${currentTrack?.trackId ?? 'none'} playing=${dockState.isPlaying} shuffle=${isShuffled} crossfade=${crossfadeEnabled}/${crossfadeDuration}s parallel=${maxConcurrentDownloads} lang=${i18n.language}`,
  );
  sendPlayerCommand('playerSetDockState', () => commands.playerSetDockState(dockState));
}

export function subscribeDockMenu(): () => void {
  lastSentKey = null;
  syncDockMenu();
  const unsubscribePlayer = usePlayerStore.subscribe(syncDockMenu);
  const unsubscribeSettings = useSettingsStore.subscribe(syncDockMenu);
  i18n.on('languageChanged', syncDockMenu);
  return () => {
    unsubscribePlayer();
    unsubscribeSettings();
    i18n.off('languageChanged', syncDockMenu);
  };
}
