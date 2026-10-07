import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { DockSettingEvent, PlayerMediaKeyEvent } from '@/bindings';
import { useSettingsStore } from '@/features/settings/store';
import { usePlayerStore } from '../store';
import { audioEngine } from '../audio-engine';
import { DOCK_SETTING_EVENT, handleDockSetting, subscribeDockMenu } from '../utils/dockMenu';
import { subscribeEqualizer } from '../utils/equalizerSync';
import { PLAYER_MEDIA_KEY_EVENT, handleMediaKey, syncMediaMetadata } from '../utils/mediaControls';
import { emitSpectrum } from '../utils/spectrumBus';

export function usePlayerEvents(): void {
  useEffect(() => {
    usePlayerStore.getState()._initAudioEngine();

    return () => {
      usePlayerStore.getState()._destroyAudioEngine();
    };
  }, []);

  useEffect(() => {
    const unlisten = listen<PlayerMediaKeyEvent>(PLAYER_MEDIA_KEY_EVENT, (event) => {
      handleMediaKey(event.payload.action, usePlayerStore.getState());
    });
    const unlistenDockSetting = listen<DockSettingEvent>(DOCK_SETTING_EVENT, (event) => {
      handleDockSetting(event.payload.action, useSettingsStore.getState());
    });
    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      if (state.currentTrack !== prevState.currentTrack) syncMediaMetadata(state.currentTrack);
    });
    const unsubscribeDockMenu = subscribeDockMenu();
    const unsubscribeEqualizer = subscribeEqualizer();
    audioEngine.setSpectrumListener(emitSpectrum);

    return () => {
      audioEngine.setSpectrumListener(null);
      unsubscribe();
      unsubscribeDockMenu();
      unsubscribeEqualizer();
      void unlisten.then((fn) => fn());
      void unlistenDockSetting.then((fn) => fn());
    };
  }, []);
}
