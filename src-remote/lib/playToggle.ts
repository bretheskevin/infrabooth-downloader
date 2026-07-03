import type { RemoteCommand, RemoteState, RemoteTrack } from '@/lib/remote-protocol';

export function sendPlayToggle(
  send: (cmd: RemoteCommand) => void,
  state: RemoteState | null,
  track: RemoteTrack,
  tracks: RemoteTrack[],
  startIndex: number,
): void {
  const isCurrent = state?.currentTrack?.trackId === track.trackId;
  if (isCurrent) {
    send(state?.state === 'playing' ? { type: 'pause' } : { type: 'resume' });
  } else {
    send({ type: 'playTracks', tracks, startIndex });
  }
}
