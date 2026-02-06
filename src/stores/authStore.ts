import { create } from 'zustand';

interface AuthState {
  isSignedIn: boolean;
  username: string | null;
  // Actions
  setAuth: (isSignedIn: boolean, username: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isSignedIn: false,
  username: null,
  setAuth: (isSignedIn, username) => set({ isSignedIn, username }),
  clearAuth: () => set({ isSignedIn: false, username: null }),
}));
