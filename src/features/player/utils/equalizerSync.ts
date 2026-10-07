import { commands, type EqualizerSettings } from '@/bindings';
import { useSettingsStore } from '@/features/settings/store';
import { logger } from '@/lib/logger';
import { sendPlayerCommand } from '../player-commands';

interface EqualizerSource {
  equalizerEnabled: boolean;
  equalizerGains: number[];
}

export function toEqualizerSettings({ equalizerEnabled, equalizerGains }: EqualizerSource): EqualizerSettings {
  return { enabled: equalizerEnabled, gainsDb: [...equalizerGains] };
}

let lastSentKey: string | null = null;

function syncEqualizer(): void {
  const settings = toEqualizerSettings(useSettingsStore.getState());
  const key = JSON.stringify(settings);
  if (key === lastSentKey) return;
  lastSentKey = key;
  void logger.info(`[equalizer-sync] Push: ${key}`);
  sendPlayerCommand('playerSetEqualizer', () => commands.playerSetEqualizer(settings));
}

export function subscribeEqualizer(): () => void {
  lastSentKey = null;
  syncEqualizer();
  return useSettingsStore.subscribe(syncEqualizer);
}
