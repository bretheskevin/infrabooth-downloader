import { create } from 'zustand';

interface AuthState {
  isSignedIn: boolean;
  username: string | null;
  plan: string | null;
  avatarUrl: string | null;
  // Actions
  setAuth: (
    isSignedIn: boolean,
    username: string | null,
    plan: string | null,
    avatarUrl: string | null
  ) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isSignedIn: false,
  username: null,
  plan: null,
  avatarUrl: null,
  setAuth: (isSignedIn, username, plan, avatarUrl) =>
    set({ isSignedIn, username, plan, avatarUrl }),
  clearAuth: () => set({ isSignedIn: false, username: null, plan: null, avatarUrl: null }),
}));
