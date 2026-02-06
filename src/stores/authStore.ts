import { create } from 'zustand';

interface AuthState {
  isSignedIn: boolean;
  username: string | null;
  plan: string | null;
  // Actions
  setAuth: (isSignedIn: boolean, username: string | null, plan: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isSignedIn: false,
  username: null,
  plan: null,
  setAuth: (isSignedIn, username, plan) => set({ isSignedIn, username, plan }),
  clearAuth: () => set({ isSignedIn: false, username: null, plan: null }),
}));
