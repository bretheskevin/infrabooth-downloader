import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createPlaybackSlice, type PlaybackSliceActions } from './playbackSlice';
import { createQueueSlice, type QueueSliceActions } from './queueSlice';
import { createShuffleSlice, type ShuffleSliceActions } from './shuffleSlice';
import { createUISlice, type UISliceActions } from './uiSlice';
import type { PlayerState } from './types';

type PlayerStore = PlayerState & PlaybackSliceActions & QueueSliceActions & ShuffleSliceActions & UISliceActions;

export const usePlayerStore = create<PlayerStore>()((...args) => ({
  ...createPlaybackSlice(...args),
  ...createQueueSlice(...args),
  ...createShuffleSlice(...args),
  ...createUISlice(...args),
}));

export const usePlayerState = () =>
  usePlayerStore(
    useShallow((s) => ({
      state: s.state,
      currentTrack: s.currentTrack,
      positionMs: s.positionMs,
      durationMs: s.durationMs,
      volume: s.volume,
    }))
  );

export const usePlayerUI = () =>
  usePlayerStore(
    useShallow((s) => ({
      isExpanded: s.isExpanded,
      isQueueOpen: s.isQueueOpen,
    }))
  );

export type { PlayerState };
