import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { logger } from '@/lib/logger';
import { getErrorString } from '@/lib/utils';
import type { ProfileSummary } from '@/bindings';

export const WARNING_APPBOUND_ENCRYPTION = 'appbound_encryption';

export interface AuthData {
  isSignedIn: boolean;
  userId: number | null;
  username: string | null;
  plan: string | null;
  avatarUrl: string | null;
  cookieWarning?: string | null;
}

interface AuthState extends Omit<AuthData, 'cookieWarning'> {
  cookieWarning: string | null;
  setAuth: (data: AuthData) => void;
  clearAuth: () => void;
  // Profile selection (persisted)
  selectedProfileKey: string | null;
  setSelectedProfileKey: (key: string | null) => void;
  // Profile picker (transient)
  profiles: ProfileSummary[];
  isPickerOpen: boolean;
  isLoadingProfiles: boolean;
  setProfiles: (profiles: ProfileSummary[]) => void;
  openPicker: () => void;
  closePicker: () => void;
}

const PERSISTED_KEYS = ['selectedProfileKey'] as const satisfies readonly (keyof AuthState)[];

function pickKeys<T extends object>(state: T, keys: readonly (keyof T)[]): Partial<T> {
  const result: Partial<T> = {};
  for (const key of keys) {
    result[key] = state[key];
  }
  return result;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isSignedIn: false,
      userId: null,
      username: null,
      plan: null,
      avatarUrl: null,
      cookieWarning: null,
      selectedProfileKey: null,
      profiles: [],
      isPickerOpen: false,
      isLoadingProfiles: false,
      setAuth: ({ isSignedIn, userId, username, plan, avatarUrl, cookieWarning = null }) =>
        set({ isSignedIn, userId, username, plan, avatarUrl, cookieWarning }),
      clearAuth: () => set({ isSignedIn: false, userId: null, username: null, plan: null, avatarUrl: null, cookieWarning: null }),
      setSelectedProfileKey: (key) => set({ selectedProfileKey: key }),
      setProfiles: (profiles) => set({ profiles, isLoadingProfiles: false }),
      openPicker: () => set({ isPickerOpen: true, isLoadingProfiles: true, profiles: [] }),
      closePicker: () => set({ isPickerOpen: false, profiles: [], isLoadingProfiles: false }),
    }),
    {
      name: 'sc-downloader-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => pickKeys(state, PERSISTED_KEYS),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          void logger.error(`Auth store hydration error: ${getErrorString(error)}`);
        }
      },
    },
  ),
);

export const useIsSignedIn = () => useAuthStore((s) => s.isSignedIn);
export const useCookieWarning = () => useAuthStore((s) => s.cookieWarning);
