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
      if (state.state === prevState.state && state.currentTrack === prevState.currentTrack) return;

      const { currentTrack, state: playbackState } = state;

      navigator.mediaSession.playbackState = PLAYBACK_STATE_MAP[playbackState] ?? 'none';

      // Update metadata
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
    });

    return () => {
      for (const [action] of handlers) {
        navigator.mediaSession.setActionHandler(action, null);
      }
      unsubscribe();
    };
  }, []);
}
