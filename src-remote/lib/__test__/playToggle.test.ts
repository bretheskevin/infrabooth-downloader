import { describe, it, expect, vi } from 'vitest';
import { sendPlayToggle } from '@remote/lib/playToggle';
import type { RemoteState, RemoteTrack } from '@/lib/remote-protocol';

const track: RemoteTrack = {
  trackId: 1,
  trackUrl: 'https://example.com/track',
  title: 'Test Track',
  artist: 'Test Artist',
  artistId: 10,
  artworkUrl: null,
  durationMs: 180000,
  waveformUrl: null,
};

const makeState = (overrides: Partial<RemoteState> = {}): RemoteState => ({
  state: 'playing',
  currentTrack: track,
  positionMs: 0,
  durationMs: 180000,
  volume: 1,
  queue: [],
  cursor: 0,
  language: 'en',
  theme: 'dark',
  downloadingTrackIds: [],
  downloadedTrackIds: [],
  ...overrides,
});

describe('sendPlayToggle', () => {
  it('sends pause when track is current and playing', () => {
    const send = vi.fn();
    sendPlayToggle(send, makeState({ state: 'playing' }), track, [track], 0);
    expect(send).toHaveBeenCalledWith({ type: 'pause' });
  });

  it('sends resume when track is current and paused', () => {
    const send = vi.fn();
    sendPlayToggle(send, makeState({ state: 'paused' }), track, [track], 0);
    expect(send).toHaveBeenCalledWith({ type: 'resume' });
  });

  it('sends resume when track is current and loading', () => {
    const send = vi.fn();
    sendPlayToggle(send, makeState({ state: 'loading' }), track, [track], 0);
    expect(send).toHaveBeenCalledWith({ type: 'resume' });
  });

  it('sends playTracks when track is not the current track', () => {
    const otherTrack: RemoteTrack = { ...track, trackId: 99 };
    const send = vi.fn();
    sendPlayToggle(send, makeState({ currentTrack: otherTrack }), track, [track], 0);
    expect(send).toHaveBeenCalledWith({ type: 'playTracks', tracks: [track], startIndex: 0 });
  });

  it('sends playTracks when state is null', () => {
    const tracks = [track];
    const send = vi.fn();
    sendPlayToggle(send, null, track, tracks, 2);
    expect(send).toHaveBeenCalledWith({ type: 'playTracks', tracks, startIndex: 2 });
  });

  it('passes startIndex through to playTracks', () => {
    const tracks = [track, { ...track, trackId: 2 }, { ...track, trackId: 3 }];
    const send = vi.fn();
    sendPlayToggle(send, null, track, tracks, 2);
    expect(send).toHaveBeenCalledWith({ type: 'playTracks', tracks, startIndex: 2 });
  });
});
