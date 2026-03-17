import { useEffect } from 'react';
import { usePlayerStore } from '../store';

const MEDIA_SESSION_STATE: Record<string, MediaSessionPlaybackState> = {
  playing: 'playing',
  paused: 'paused',
  loading: 'playing',
  stopped: 'none',
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

    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => usePlayerStore.getState().resume()],
      ['pause', () => usePlayerStore.getState().pause()],
      ['nexttrack', () => void usePlayerStore.getState().next()],
      ['previoustrack', () => void usePlayerStore.getState().previous()],
    ];

    for (const [action, handler] of handlers) {
      navigator.mediaSession.setActionHandler(action, handler);
    }

    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      if (state.state === prevState.state && state.currentTrack === prevState.currentTrack) return;

      const { currentTrack, state: playbackState } = state;

      navigator.mediaSession.playbackState = MEDIA_SESSION_STATE[playbackState] ?? 'none';

      if (currentTrack) {
        const artwork: MediaImage[] = currentTrack.artworkUrl
          ? [{ src: currentTrack.artworkUrl }]
          : [];
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          artwork,
        });
      } else {
        navigator.mediaSession.metadata = null;
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
