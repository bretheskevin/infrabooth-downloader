import { commands, type PlayerMediaKeyAction, type PlayerMediaMetadata } from '@/bindings';
import { logger } from '@/lib/logger';
import { type ArtworkSize, getArtworkUrl } from '@/lib/soundcloud';
import { sendPlayerCommand } from '../player-commands';
import type { PlaybackItem, PlaybackState } from '../types';

export const PLAYER_MEDIA_KEY_EVENT = 'player-media-key';
const ARTWORK_SIZE: ArtworkSize = 500;

export interface MediaKeyTarget {
  state: PlaybackState;
  resume: () => void;
  pause: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (positionMs: number) => void;
  toggleShuffle: () => void;
}

export function toMediaMetadata(track: PlaybackItem | null): PlayerMediaMetadata | null {
  if (!track) return null;
  return {
    title: track.title,
    artist: track.artist,
    artworkUrl: getArtworkUrl(track.artworkUrl, ARTWORK_SIZE),
    durationMs: track.durationMs,
  };
}

export function syncMediaMetadata(track: PlaybackItem | null): void {
  const metadata = toMediaMetadata(track);
  void logger.debug(`[media-controls] Sync metadata: ${metadata ? `track ${track?.trackId}` : 'cleared'}`);
  sendPlayerCommand('playerSetMediaMetadata', () => commands.playerSetMediaMetadata(metadata));
}

export function handleMediaKey(action: PlayerMediaKeyAction, target: MediaKeyTarget): void {
  void logger.info(`[media-controls] Media key: ${action.type} (state=${target.state})`);
  switch (action.type) {
    case 'play':
      target.resume();
      return;
    case 'pause':
      target.pause();
      return;
    case 'next':
      void target.next();
      return;
    case 'previous':
      void target.previous();
      return;
    case 'toggle':
      if (target.state === 'playing' || target.state === 'loading') target.pause();
      else target.resume();
      return;
    case 'seek':
      target.seek(action.positionMs);
      return;
    case 'toggleShuffle':
      target.toggleShuffle();
      return;
  }
}
