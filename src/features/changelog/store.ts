import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ChangelogState {
  lastSeenVersion: string | null;
  cachedBody: string | null;
  cachedDate: string | null;
  _hasHydrated: boolean;
  setLastSeenVersion: (version: string) => void;
  cacheChangelog: (body: string | null, date: string | null) => void;
  _setHasHydrated: (state: boolean) => void;
}

export const useChangelogStore = create<ChangelogState>()(
  persist(
    (set) => ({
      lastSeenVersion: null,
      cachedBody: null,
      cachedDate: null,
      _hasHydrated: false,
      setLastSeenVersion: (version) => set({ lastSeenVersion: version }),
      cacheChangelog: (body, date) => set({ cachedBody: body, cachedDate: date }),
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
          console.error('Changelog hydration error:', error);
        }
        state?._setHasHydrated(true);
      },
    }
  )
);

export const useChangelogHydrated = () =>
  useChangelogStore((state) => state._hasHydrated);
