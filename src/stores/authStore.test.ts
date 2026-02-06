import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      isSignedIn: false,
      username: null,
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
  });

  describe('setAuth', () => {
    it('should set isSignedIn to true when signed in', () => {
      const { setAuth } = useAuthStore.getState();
      setAuth(true, 'testuser');

      const { isSignedIn } = useAuthStore.getState();
      expect(isSignedIn).toBe(true);
    });

    it('should set username when signed in', () => {
      const { setAuth } = useAuthStore.getState();
      setAuth(true, 'testuser');

      const { username } = useAuthStore.getState();
      expect(username).toBe('testuser');
    });

    it('should set isSignedIn to false with null username when signed out', () => {
      const { setAuth } = useAuthStore.getState();
      setAuth(true, 'testuser');
      setAuth(false, null);

      const { isSignedIn, username } = useAuthStore.getState();
      expect(isSignedIn).toBe(false);
      expect(username).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should reset isSignedIn to false', () => {
      const { setAuth, clearAuth } = useAuthStore.getState();
      setAuth(true, 'testuser');
      clearAuth();

      const { isSignedIn } = useAuthStore.getState();
      expect(isSignedIn).toBe(false);
    });

    it('should reset username to null', () => {
      const { setAuth, clearAuth } = useAuthStore.getState();
      setAuth(true, 'testuser');
      clearAuth();

      const { username } = useAuthStore.getState();
      expect(username).toBeNull();
    });
  });
});
