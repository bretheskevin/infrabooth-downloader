import { useEffect } from 'react';
import { type ArtworkSize, getArtworkUrl } from '@/lib/soundcloud';
import { usePlayerStore } from '../store';

const ARTWORK_SIZE: ArtworkSize = 500;

const PLAYBACK_STATE_MAP: Record<string, MediaSessionPlaybackState> = {
  playing: 'playing',
  paused: 'paused',
  loading: 'playing',
};

export function usePlayerEvents(): void {
  useEffect(() => {
    usePlayerStore.getState()._initAudioEngine();

    return () => {
      usePlayerStore.getState()._destroyAudioEngine();
    };
  }, []);

  // Register MediaSession handlers and sync metadata/playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Register action handlers
    const store = usePlayerStore.getState;
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => store().resume()],
      ['pause', () => store().pause()],
      ['previoustrack', () => void store().previous()],
      ['nexttrack', () => void store().next()],
    ];

    for (const [action, handler] of handlers) {
      navigator.mediaSession.setActionHandler(action, handler);
    }

    // Sync state changes to MediaSession
    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      const trackChanged = state.currentTrack !== prevState.currentTrack;
      const stateChanged = state.state !== prevState.state;
      const durationChanged = state.durationMs !== prevState.durationMs;
      const seeked = Math.abs(state.positionMs - prevState.positionMs) > 2000;

      if (stateChanged || trackChanged) {
        const { currentTrack, state: playbackState } = state;

        navigator.mediaSession.playbackState = PLAYBACK_STATE_MAP[playbackState] ?? 'none';

        if (currentTrack) {
          const artworkSrc = getArtworkUrl(currentTrack.artworkUrl, ARTWORK_SIZE);
          const artwork: MediaImage[] = artworkSrc ? [{ src: artworkSrc }] : [];

          navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title,
            artist: currentTrack.artist,
            artwork,
          });
        } else {
          navigator.mediaSession.metadata = null;
        }
      }

      if (stateChanged && state.state === 'stopped') {
        navigator.mediaSession.setPositionState();
      } else if ((trackChanged || stateChanged || durationChanged || seeked) && state.durationMs > 0 && state.state !== 'stopped') {
        navigator.mediaSession.setPositionState({
          duration: state.durationMs / 1000,
          position: Math.min(state.positionMs / 1000, state.durationMs / 1000),
          playbackRate: 1,
        });
      }
    });

    return () => {
      for (const [action] of handlers) {
        navigator.mediaSession.setActionHandler(action, null);
      }
      unsubscribe();
    };
  }, []);
}
