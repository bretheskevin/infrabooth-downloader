import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      isSignedIn: false,
      username: null,
      plan: null,
      avatarUrl: null,
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
      setAuth(true, 'testuser', 'Pro Unlimited', 'https://example.com/avatar.jpg');

      const { isSignedIn } = useAuthStore.getState();
      expect(isSignedIn).toBe(true);
    });

    it('should set username when signed in', () => {
      const { setAuth } = useAuthStore.getState();
      setAuth(true, 'testuser', 'Pro Unlimited', 'https://example.com/avatar.jpg');

      const { username } = useAuthStore.getState();
      expect(username).toBe('testuser');
    });

    it('should set avatarUrl when signed in', () => {
      const { setAuth } = useAuthStore.getState();
      setAuth(true, 'testuser', 'Pro Unlimited', 'https://example.com/avatar.jpg');

      const { avatarUrl } = useAuthStore.getState();
      expect(avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should set isSignedIn to false with null username when signed out', () => {
      const { setAuth } = useAuthStore.getState();
      setAuth(true, 'testuser', 'Pro Unlimited', 'https://example.com/avatar.jpg');
      setAuth(false, null, null, null);

      const { isSignedIn, username, avatarUrl } = useAuthStore.getState();
      expect(isSignedIn).toBe(false);
      expect(username).toBeNull();
      expect(avatarUrl).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should reset isSignedIn to false', () => {
      const { setAuth, clearAuth } = useAuthStore.getState();
      setAuth(true, 'testuser', 'Pro Unlimited', 'https://example.com/avatar.jpg');
      clearAuth();

      const { isSignedIn } = useAuthStore.getState();
      expect(isSignedIn).toBe(false);
    });

    it('should reset username to null', () => {
      const { setAuth, clearAuth } = useAuthStore.getState();
      setAuth(true, 'testuser', 'Pro Unlimited', 'https://example.com/avatar.jpg');
      clearAuth();

      const { username } = useAuthStore.getState();
      expect(username).toBeNull();
    });

    it('should reset avatarUrl to null', () => {
      const { setAuth, clearAuth } = useAuthStore.getState();
      setAuth(true, 'testuser', 'Pro Unlimited', 'https://example.com/avatar.jpg');
      clearAuth();

      const { avatarUrl } = useAuthStore.getState();
      expect(avatarUrl).toBeNull();
    });
  });
});
