export type PlayToggleAction = 'pause' | 'resume' | 'play';

export function resolvePlayToggle(isCurrentTrack: boolean, isPlaying: boolean): PlayToggleAction {
  if (isCurrentTrack) return isPlaying ? 'pause' : 'resume';
  return 'play';
}
