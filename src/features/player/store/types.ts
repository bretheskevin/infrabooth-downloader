import type { PlaybackItem, PlaybackState } from '../types';

export interface PlaybackSliceState {
  state: PlaybackState;
  currentTrack: PlaybackItem | null;
  cursor: number;
  positionMs: number;
  durationMs: number;
  crossfadePending: boolean;
  crossfadingTrackId: number | null;
}

export interface QueueSliceState {
  queue: PlaybackItem[];
  originalQueue: PlaybackItem[] | null;
  isShuffled: boolean;
  manualQueueCount: number;
}

export interface UISliceState {
  isExpanded: boolean;
  isQueueOpen: boolean;
  isCommentsOpen: boolean;
  railTab: 'queue' | 'comments';
  volume: number;
}

export interface AutoplaySliceState {
  stationQueueCount: number;
  autoplayInFlight: boolean;
}

export type PlayerState = PlaybackSliceState & QueueSliceState & UISliceState & AutoplaySliceState;
