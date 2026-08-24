import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useRef } from 'react';

interface RekordboxExclusionState {
  excludedByPlaylist: Record<string, number[]>;
  toggleExcluded: (playlistId: string, trackId: number) => void;
  excludeTracks: (playlistId: string, trackIds: number[]) => void;
}

export const useRekordboxExclusionStore = create<RekordboxExclusionState>()(
  persist(
    (set) => ({
      excludedByPlaylist: {},

      toggleExcluded: (playlistId, trackId) =>
        set((state) => {
          const current = state.excludedByPlaylist[playlistId] ?? [];
          const exists = current.includes(trackId);
          return {
            excludedByPlaylist: {
              ...state.excludedByPlaylist,
              [playlistId]: exists ? current.filter((id) => id !== trackId) : [...current, trackId],
            },
          };
        }),

      excludeTracks: (playlistId, trackIds) =>
        set((state) => {
          const current = state.excludedByPlaylist[playlistId] ?? [];
          const existingSet = new Set(current);
          const merged = [...current, ...trackIds.filter((id) => !existingSet.has(id))];
          return {
            excludedByPlaylist: {
              ...state.excludedByPlaylist,
              [playlistId]: merged,
            },
          };
        }),
    }),
    {
      name: 'sc-downloader-rekordbox-exclusions',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

const EMPTY_SET = new Set<number>();

export function useExcludedTrackIds(playlistId?: string): Set<number> {
  const arr = useRekordboxExclusionStore((s) => (playlistId ? s.excludedByPlaylist[playlistId] : undefined));
  const prevRef = useRef<{ arr: number[] | undefined; set: Set<number> }>({ arr: undefined, set: EMPTY_SET });

  if (arr === prevRef.current.arr) {
    return prevRef.current.set;
  }

  const next = arr && arr.length > 0 ? new Set(arr) : EMPTY_SET;
  prevRef.current = { arr, set: next };
  return next;
}
