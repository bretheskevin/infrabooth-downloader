import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/bindings', () => ({
  commands: {
    playerSetMediaMetadata: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
  },
}));

import { commands } from '@/bindings';
import { getArtworkUrl } from '@/lib/soundcloud';
import { handleMediaKey, syncMediaMetadata, toMediaMetadata, type MediaKeyTarget } from '../utils/mediaControls';
import { flushPlayerCommands } from '../player-commands';
import type { PlaybackItem, PlaybackState } from '../types';

const track: PlaybackItem = {
  trackId: 1,
  trackUrl: 'https://soundcloud.com/test/track-1',
  title: 'Test Track',
  artist: 'Test Artist',
  artistId: 1,
  artworkUrl: 'https://i1.sndcdn.com/artworks-abc-large.jpg',
  durationMs: 180000,
  waveformUrl: null,
};

function makeTarget(state: PlaybackState): MediaKeyTarget {
  return {
    state,
    resume: vi.fn(),
    pause: vi.fn(),
    next: vi.fn().mockResolvedValue(undefined),
    previous: vi.fn().mockResolvedValue(undefined),
    seek: vi.fn(),
  };
}

describe('media controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds metadata with the same fields mediaSession used', () => {
    expect(toMediaMetadata(track)).toEqual({
      title: 'Test Track',
      artist: 'Test Artist',
      artworkUrl: getArtworkUrl(track.artworkUrl, 500),
      durationMs: 180000,
    });
    expect(toMediaMetadata({ ...track, artworkUrl: null })?.artworkUrl).toBeNull();
    expect(toMediaMetadata(null)).toBeNull();
  });

  it('sends metadata and clears it to the native layer', async () => {
    syncMediaMetadata(track);
    syncMediaMetadata(null);
    await flushPlayerCommands();
    expect(vi.mocked(commands.playerSetMediaMetadata).mock.calls).toEqual([[toMediaMetadata(track)], [null]]);
  });

  it('maps play/pause/next/previous to the same store actions as before', () => {
    const target = makeTarget('paused');
    handleMediaKey({ type: 'play' }, target);
    handleMediaKey({ type: 'pause' }, target);
    handleMediaKey({ type: 'next' }, target);
    handleMediaKey({ type: 'previous' }, target);
    expect(target.resume).toHaveBeenCalledTimes(1);
    expect(target.pause).toHaveBeenCalledTimes(1);
    expect(target.next).toHaveBeenCalledTimes(1);
    expect(target.previous).toHaveBeenCalledTimes(1);
  });

  it('toggle pauses when playing or loading and resumes otherwise', () => {
    for (const state of ['playing', 'loading'] as const) {
      const target = makeTarget(state);
      handleMediaKey({ type: 'toggle' }, target);
      expect(target.pause).toHaveBeenCalled();
      expect(target.resume).not.toHaveBeenCalled();
    }
    for (const state of ['paused', 'stopped'] as const) {
      const target = makeTarget(state);
      handleMediaKey({ type: 'toggle' }, target);
      expect(target.resume).toHaveBeenCalled();
    }
  });

  it('seek forwards the absolute position', () => {
    const target = makeTarget('playing');
    handleMediaKey({ type: 'seek', positionMs: 4200 }, target);
    expect(target.seek).toHaveBeenCalledWith(4200);
  });
});
