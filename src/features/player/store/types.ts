import type { PlaybackItem, PlaybackState } from '../types';

export interface PlaybackSliceState {
  state: PlaybackState;
  currentTrack: PlaybackItem | null;
  cursor: number;
  positionMs: number;
  durationMs: number;
}

export interface QueueSliceState {
  queue: PlaybackItem[];
  originalQueue: PlaybackItem[] | null;
  isShuffled: boolean;
}

export interface UISliceState {
  isExpanded: boolean;
  isQueueOpen: boolean;
  volume: number;
}

export type PlayerState = PlaybackSliceState & QueueSliceState & UISliceState;
