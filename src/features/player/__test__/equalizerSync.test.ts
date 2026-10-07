import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/bindings', () => ({
  commands: {
    playerSetEqualizer: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
  },
}));

import { commands } from '@/bindings';
import { useSettingsStore } from '@/features/settings/store';
import { presetGains } from '@/features/settings/utils/equalizerPresets';
import { flushPlayerCommands } from '../player-commands';
import { subscribeEqualizer, toEqualizerSettings } from '../utils/equalizerSync';

const FLAT = presetGains('flat');
const pushed = () => vi.mocked(commands.playerSetEqualizer).mock.calls.map(([settings]) => settings);

describe('equalizer sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ equalizerEnabled: false, equalizerPreset: 'flat', equalizerGains: [...FLAT], crossfadeDuration: 5 });
  });

  it('maps store fields to the Rust payload', () => {
    const gains = [1, 2, 3, 4, 5];
    expect(toEqualizerSettings({ equalizerEnabled: true, equalizerGains: gains })).toEqual({ enabled: true, gainsDb: gains });
  });

  it('pushes the current settings on subscribe', async () => {
    const unsubscribe = subscribeEqualizer();
    await flushPlayerCommands();
    expect(pushed()).toEqual([{ enabled: false, gainsDb: FLAT }]);
    unsubscribe();
  });

  it('pushes equalizer changes and skips unrelated settings changes', async () => {
    const unsubscribe = subscribeEqualizer();
    useSettingsStore.getState().setEqualizerEnabled(true);
    useSettingsStore.getState().setCrossfadeDuration(9);
    useSettingsStore.getState().setEqualizerBandGain(0, 3);
    useSettingsStore.getState().setEqualizerBandGain(0, 3);
    await flushPlayerCommands();
    expect(pushed()).toEqual([
      { enabled: false, gainsDb: FLAT },
      { enabled: true, gainsDb: FLAT },
      { enabled: true, gainsDb: [3, ...FLAT.slice(1)] },
    ]);
    unsubscribe();
  });

  it('stops pushing after unsubscribe', async () => {
    const unsubscribe = subscribeEqualizer();
    unsubscribe();
    useSettingsStore.getState().setEqualizerEnabled(true);
    await flushPlayerCommands();
    expect(commands.playerSetEqualizer).toHaveBeenCalledTimes(1);
  });
});
