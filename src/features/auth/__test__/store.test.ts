import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store';
import type { ProfileSummary } from '@/bindings';

const signedInData = {
  isSignedIn: true,
  userId: 12345,
  username: 'testuser',
  plan: 'Pro Unlimited',
  avatarUrl: 'https://example.com/avatar.jpg',
} as const;

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      isSignedIn: false,
      userId: null,
      username: null,
      plan: null,
      avatarUrl: null,
      cookieWarning: null,
      selectedProfileKey: null,
      profiles: [],
      isPickerOpen: false,
    });
  });

  describe('initial state', () => {
    it('should have isSignedIn as false', () => {
      const { isSignedIn } = useAuthStore.getState();
      expect(isSignedIn).toBe(false);
    });

    it('should have username as null', () => {
      const { username } = useAuthStore.getState();
      expect(username).toBeNull();
    });

    it('should have avatarUrl as null', () => {
      const { avatarUrl } = useAuthStore.getState();
      expect(avatarUrl).toBeNull();
    });
  });

  describe('setAuth', () => {
    it('should set isSignedIn to true when signed in', () => {
      const { setAuth } = useAuthStore.getState();
      setAuth(signedInData);

      const { isSignedIn } = useAuthStore.getState();
      expect(isSignedIn).toBe(true);
    });

    it('should set username when signed in', () => {
      const { setAuth } = useAuthStore.getState();
      setAuth(signedInData);

      const { username } = useAuthStore.getState();
      expect(username).toBe('testuser');
    });

    it('should set avatarUrl when signed in', () => {
      const { setAuth } = useAuthStore.getState();
      setAuth(signedInData);

      const { avatarUrl } = useAuthStore.getState();
      expect(avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should set isSignedIn to false with null username when signed out', () => {
      const { setAuth } = useAuthStore.getState();
      setAuth(signedInData);
      setAuth({ isSignedIn: false, userId: null, username: null, plan: null, avatarUrl: null });

      const { isSignedIn, username, avatarUrl } = useAuthStore.getState();
      expect(isSignedIn).toBe(false);
      expect(username).toBeNull();
      expect(avatarUrl).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should reset isSignedIn to false', () => {
      const { setAuth, clearAuth } = useAuthStore.getState();
      setAuth(signedInData);
      clearAuth();

      const { isSignedIn } = useAuthStore.getState();
      expect(isSignedIn).toBe(false);
    });

    it('should reset username to null', () => {
      const { setAuth, clearAuth } = useAuthStore.getState();
      setAuth(signedInData);
      clearAuth();

      const { username } = useAuthStore.getState();
      expect(username).toBeNull();
    });

    it('should reset avatarUrl to null', () => {
      const { setAuth, clearAuth } = useAuthStore.getState();
      setAuth(signedInData);
      clearAuth();

      const { avatarUrl } = useAuthStore.getState();
      expect(avatarUrl).toBeNull();
    });
  });

  describe('profile selection persistence', () => {
    it('should persist selectedProfileKey', () => {
      useAuthStore.getState().setSelectedProfileKey('Chrome:Profile 1');
      expect(useAuthStore.getState().selectedProfileKey).toBe('Chrome:Profile 1');
    });

    it('should clear selectedProfileKey', () => {
      useAuthStore.getState().setSelectedProfileKey('Chrome:Profile 1');
      useAuthStore.getState().setSelectedProfileKey(null);
      expect(useAuthStore.getState().selectedProfileKey).toBeNull();
    });

    it('should open and close picker', () => {
      useAuthStore.getState().openPicker();
      expect(useAuthStore.getState().isPickerOpen).toBe(true);

      const mockProfile: ProfileSummary = {
        key: 'Chrome:Profile 1',
        browser: 'Chrome',
        profile: 'Profile 1',
        username: 'testuser',
        avatarUrl: null,
        plan: null,
      };
      useAuthStore.getState().setProfiles([mockProfile]);
      useAuthStore.getState().closePicker();
      expect(useAuthStore.getState().isPickerOpen).toBe(false);
      expect(useAuthStore.getState().profiles).toEqual([]);
    });
  });
});
