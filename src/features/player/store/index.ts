import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createAutoplaySlice, type AutoplaySliceActions } from './autoplaySlice';
import { createPlaybackSlice, type PlaybackSliceActions } from './playbackSlice';
import { createQueueSlice, type QueueSliceActions } from './queueSlice';
import { createShuffleSlice, type ShuffleSliceActions } from './shuffleSlice';
import { createUISlice, type UISliceActions } from './uiSlice';
import type { PlayerState } from './types';

type PlayerStore = PlayerState & PlaybackSliceActions & QueueSliceActions & ShuffleSliceActions & UISliceActions & AutoplaySliceActions;

export const usePlayerStore = create<PlayerStore>()((...args) => ({
  ...createAutoplaySlice(...args),
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
    })),
  );

export const usePlayerUI = () =>
  usePlayerStore(
    useShallow((s) => ({
      isExpanded: s.isExpanded,
      isQueueOpen: s.isQueueOpen,
      isCommentsOpen: s.isCommentsOpen,
      railTab: s.railTab,
    })),
  );

export type { PlayerState };
