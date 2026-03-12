import { useEffect } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { usePlayerStore } from '../store';
import { api } from '@/lib/tauri';
import { fromBindingsItem } from '../types';
import type {
  PlaybackStateChangedEvent,
  PlayerProgressEvent,
  PlayerTrackChangedEvent,
  PlayerErrorEvent,
} from '../types';

export function usePlayerEvents(): void {
  useEffect(() => {
    let mounted = true;
    const unlisteners: UnlistenFn[] = [];

    const setup = async () => {
      // Register all listeners concurrently to avoid missing events during setup
      const listeners = await Promise.all([
        listen<PlaybackStateChangedEvent>('player:state-changed', (e) => {
          usePlayerStore.getState()._onStateChanged(e.payload.state, e.payload.track_id);
        }),
        listen<PlayerProgressEvent>('player:progress', (e) => {
          usePlayerStore.getState()._onProgress(e.payload.position_ms, e.payload.duration_ms);
        }),
        listen<PlayerTrackChangedEvent>('player:track-changed', (e) => {
          usePlayerStore.getState()._onTrackChanged(e.payload.track_id, e.payload.cursor, e.payload.queue_length);
        }),
        listen<PlayerErrorEvent>('player:error', (e) => {
          usePlayerStore.getState()._onError(e.payload.track_id, e.payload.message);
        }),
      ]);
      unlisteners.push(...listeners);

      if (!mounted) return;

      // Reconcile state AFTER listeners are active (handles hot-reload)
      try {
        const snapshot = await api.playerGetState();
        if (!mounted) return;
        if (snapshot.state !== 'stopped') {
          const queue = snapshot.queue.map(fromBindingsItem);
          usePlayerStore.setState({
            state: snapshot.state,
            queue,
            cursor: snapshot.cursor,
            currentTrack: queue[snapshot.cursor] ?? null,
            positionMs: snapshot.position_ms,
            durationMs: snapshot.duration_ms,
            volume: snapshot.volume,
          });
        }
      } catch (e) {
        console.warn('[player] Failed to restore state:', e);
      }
    };

    setup();

    return () => {
      mounted = false;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);
}
