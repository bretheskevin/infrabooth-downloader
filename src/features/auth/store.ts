import { create } from 'zustand';

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
}

export const useAuthStore = create<AuthState>((set) => ({
  isSignedIn: false,
  userId: null,
  username: null,
  plan: null,
  avatarUrl: null,
  cookieWarning: null,
  setAuth: ({ isSignedIn, userId, username, plan, avatarUrl, cookieWarning = null }) =>
    set({ isSignedIn, userId, username, plan, avatarUrl, cookieWarning }),
  clearAuth: () => set({ isSignedIn: false, userId: null, username: null, plan: null, avatarUrl: null, cookieWarning: null }),
}));

export const useIsSignedIn = () => useAuthStore((s) => s.isSignedIn);
export const useCookieWarning = () => useAuthStore((s) => s.cookieWarning);
