import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { logger } from '@/lib/logger';
import { getErrorString } from '@/lib/utils';

interface ChangelogState {
  lastSeenVersion: string | null;
  _hasHydrated: boolean;
  setLastSeenVersion: (version: string) => void;
  _setHasHydrated: (state: boolean) => void;
}

export const useChangelogStore = create<ChangelogState>()(
  persist(
    (set) => ({
      lastSeenVersion: null,
      _hasHydrated: false,
      setLastSeenVersion: (version) => set({ lastSeenVersion: version }),
      _setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'sc-downloader-changelog',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lastSeenVersion: state.lastSeenVersion,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          void logger.error(`Changelog hydration error: ${getErrorString(error)}`);
        }
        state?._setHasHydrated(true);
      },
    },
  ),
);

export const useChangelogHydrated = () => useChangelogStore((state) => state._hasHydrated);
