import { create } from 'zustand';

export const WARNING_APPBOUND_ENCRYPTION = 'appbound_encryption';

export interface AuthData {
  isSignedIn: boolean;
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
  username: null,
  plan: null,
  avatarUrl: null,
  cookieWarning: null,
  setAuth: ({ isSignedIn, username, plan, avatarUrl, cookieWarning = null }) =>
    set({ isSignedIn, username, plan, avatarUrl, cookieWarning }),
  clearAuth: () => set({ isSignedIn: false, username: null, plan: null, avatarUrl: null, cookieWarning: null }),
}));

export const useIsSignedIn = () => useAuthStore((s) => s.isSignedIn);
export const useCookieWarning = () => useAuthStore((s) => s.cookieWarning);
