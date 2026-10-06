import { commands, type DockMenuLabels, type DockMenuState } from '@/bindings';
import i18n from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { sendPlayerCommand } from '../player-commands';
import { usePlayerStore } from '../store';
import type { PlaybackItem, PlaybackState } from '../types';

type Translate = (key: string) => string;

export interface DockMenuSource {
  currentTrack: PlaybackItem | null;
  state: PlaybackState;
  isShuffled: boolean;
}

function toDockMenuLabels(t: Translate): DockMenuLabels {
  return {
    play: t('player.play'),
    pause: t('player.pause'),
    next: t('player.next'),
    previous: t('player.previous'),
    shuffle: t('player.shuffle'),
    notPlaying: t('player.notPlaying'),
  };
}

export function toDockMenuState({ currentTrack, state, isShuffled }: DockMenuSource, t: Translate): DockMenuState {
  return {
    title: currentTrack ? `${currentTrack.title} — ${currentTrack.artist}` : null,
    isPlaying: state === 'playing' || state === 'loading',
    hasTrack: currentTrack !== null,
    shuffle: isShuffled,
    labels: toDockMenuLabels(t),
  };
}

let lastSentKey: string | null = null;

function syncDockMenu(): void {
  const { currentTrack, state, isShuffled } = usePlayerStore.getState();
  const dockState = toDockMenuState({ currentTrack, state, isShuffled }, (key) => i18n.t(key));
  const key = JSON.stringify(dockState);
  if (key === lastSentKey) return;
  lastSentKey = key;
  void logger.debug(
    `[dock-menu] Sync: track=${currentTrack?.trackId ?? 'none'} playing=${dockState.isPlaying} shuffle=${isShuffled} lang=${i18n.language}`,
  );
  sendPlayerCommand('playerSetDockState', () => commands.playerSetDockState(dockState));
}

export function subscribeDockMenu(): () => void {
  lastSentKey = null;
  syncDockMenu();
  const unsubscribePlayer = usePlayerStore.subscribe(syncDockMenu);
  i18n.on('languageChanged', syncDockMenu);
  return () => {
    unsubscribePlayer();
    i18n.off('languageChanged', syncDockMenu);
  };
}
