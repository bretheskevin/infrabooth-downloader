import type { RemoteCommand, RemoteState, RemoteTrack } from '@/lib/remote-protocol';
import { resolvePlayToggle } from '@/lib/playToggle';

export function sendPlayToggle(
  send: (cmd: RemoteCommand) => void,
  state: RemoteState | null,
  track: RemoteTrack,
  tracks: RemoteTrack[],
  startIndex: number,
): void {
  const isCurrent = state?.currentTrack?.trackId === track.trackId;
  const action = resolvePlayToggle(isCurrent, state?.state === 'playing');

  if (action === 'play') {
    send({ type: 'playTracks', tracks, startIndex });
    return;
  }
  send(action === 'pause' ? { type: 'pause' } : { type: 'resume' });
}
