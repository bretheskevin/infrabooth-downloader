import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { PlayerMediaKeyEvent } from '@/bindings';
import { usePlayerStore } from '../store';
import { PLAYER_MEDIA_KEY_EVENT, handleMediaKey, syncMediaMetadata } from '../utils/mediaControls';

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
    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      if (state.currentTrack !== prevState.currentTrack) syncMediaMetadata(state.currentTrack);
    });

    return () => {
      unsubscribe();
      void unlisten.then((fn) => fn());
    };
  }, []);
}
