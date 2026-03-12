import { create } from 'zustand';
import { toast } from 'sonner';
import i18n from '@/lib/i18n';
import { api } from '@/lib/tauri';
import { useSettingsStore } from '@/features/settings/store';
import type { PlaybackItem, PlaybackState } from './types';
import { toBindingsItem } from './types';

interface PlayerStore {
  state: PlaybackState;
  currentTrack: PlaybackItem | null;
  queue: PlaybackItem[];
  cursor: number;
  positionMs: number;
  durationMs: number;
  volume: number;
  isExpanded: boolean;
  isQueueOpen: boolean;

  // IPC actions
  play: (queue: PlaybackItem[], index: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  stop: () => Promise<void>;
  reorderQueue: (fromIndex: number, toIndex: number) => Promise<void>;
  removeFromQueue: (index: number) => Promise<void>;

  // UI-only actions
  toggleExpanded: () => void;
  toggleQueue: () => void;
  collapse: () => void;

  // Event handlers (called by usePlayerEvents)
  _onStateChanged: (state: PlaybackState, trackId: number | null) => void;
  _onProgress: (positionMs: number, durationMs: number) => void;
  _onTrackChanged: (trackId: number, cursor: number, queueLength: number) => void;
  _onError: (trackId: number | null, message: string) => void;
}

async function skipTo(
  set: (partial: Partial<PlayerStore>) => void,
  queue: PlaybackItem[],
  cursor: number,
  targetCursor: number,
  apiFn: () => Promise<void>,
  errorKey: string,
) {
  if (targetCursor < 0 || targetCursor >= queue.length) return;
  set({ cursor: targetCursor, currentTrack: queue[targetCursor] ?? null, state: 'loading', positionMs: 0, durationMs: 0 });
  try {
    await apiFn();
  } catch {
    set({ cursor, currentTrack: queue[cursor] ?? null });
    toast.error(i18n.t(errorKey));
  }
}

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  state: 'stopped',
  currentTrack: null,
  queue: [],
  cursor: 0,
  positionMs: 0,
  durationMs: 0,
  volume: 1.0,
  isExpanded: false,
  isQueueOpen: false,

  play: async (queue, index) => {
    const vol = useSettingsStore.getState().playerVolume;
    set({ queue, cursor: index, currentTrack: queue[index] ?? null, state: 'loading', volume: vol });
    try {
      await api.playerSetVolume(vol);
      await api.playerPlayAt(queue.map(toBindingsItem), index);
    } catch (e) {
      set({ state: 'stopped', currentTrack: null, queue: [], cursor: 0, positionMs: 0, durationMs: 0 });
      throw e;
    }
  },

  pause: async () => { await api.playerPause(); },
  resume: async () => { await api.playerResume(); },
  seek: async (positionMs) => { await api.playerSeek(positionMs); },
  next: async () => {
    const { queue, cursor } = get();
    await skipTo(set, queue, cursor, cursor + 1, api.playerNext, 'player.errorNext');
  },
  previous: async () => {
    const { queue, cursor } = get();
    await skipTo(set, queue, cursor, cursor - 1, api.playerPrevious, 'player.errorPrevious');
  },
  stop: async () => { await api.playerStop(); },

  setVolume: async (volume) => {
    const prev = get().volume;
    set({ volume });
    try {
      await api.playerSetVolume(volume);
      useSettingsStore.getState().setPlayerVolume(volume);
    } catch (e) {
      set({ volume: prev });
      throw e;
    }
  },

  reorderQueue: async (fromIndex, toIndex) => {
    const { queue, cursor } = get();
    const newQueue = [...queue];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved!);

    let newCursor = cursor;
    if (fromIndex === cursor) {
      newCursor = toIndex;
    } else if (fromIndex < cursor && toIndex >= cursor) {
      newCursor = cursor - 1;
    } else if (fromIndex > cursor && toIndex <= cursor) {
      newCursor = cursor + 1;
    }

    set({ queue: newQueue, cursor: newCursor, currentTrack: newQueue[newCursor] ?? null });
    try {
      await api.playerReorderQueue(fromIndex, toIndex);
    } catch (e) {
      set({ queue, cursor, currentTrack: queue[cursor] ?? null });
      throw e;
    }
  },

  removeFromQueue: async (index) => {
    const { queue, cursor } = get();
    const newQueue = queue.filter((_, i) => i !== index);
    let newCursor = cursor;
    if (newQueue.length === 0) {
      set({ queue: [], cursor: 0, currentTrack: null, state: 'stopped', positionMs: 0, isQueueOpen: false });
      await api.playerRemoveFromQueue(index);
      return;
    }
    if (index < cursor) {
      newCursor = cursor - 1;
    } else if (index === cursor) {
      newCursor = Math.min(cursor, newQueue.length - 1);
    }
    set({ queue: newQueue, cursor: newCursor, currentTrack: newQueue[newCursor] ?? null });
    try {
      await api.playerRemoveFromQueue(index);
    } catch (e) {
      set({ queue, cursor, currentTrack: queue[cursor] ?? null });
      throw e;
    }
  },

  toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),
  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),
  collapse: () => set({ isExpanded: false }),

  _onStateChanged: (state, _trackId) => {
    if (state === 'stopped') {
      set({ state, currentTrack: null, queue: [], cursor: 0, positionMs: 0, durationMs: 0, isQueueOpen: false });
    } else {
      set({ state });
    }
  },

  _onProgress: (positionMs, durationMs) => {
    set({ positionMs, durationMs });
  },

  _onTrackChanged: (_trackId, cursor) => {
    const { queue } = get();
    const currentTrack = queue[cursor] ?? null;
    set({ cursor, currentTrack, positionMs: 0 });
  },

  _onError: (_trackId, message) => {
    console.error(`[player] Error for track ${_trackId}: ${message}`);
    const { state } = get();
    if (state === 'loading') {
      set({ state: 'stopped', positionMs: 0, durationMs: 0 });
    }
  },
}));
