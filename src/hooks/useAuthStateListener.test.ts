import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStateListener } from './useAuthStateListener';
import { useAuthStore } from '@/stores/authStore';

// Mock Tauri event API
const mockUnlistenAuthState = vi.fn();
const mockUnlistenReauthNeeded = vi.fn();
let eventListeners: Map<string, (event: { payload?: unknown }) => void> = new Map();

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((eventName: string, callback: (event: { payload?: unknown }) => void) => {
    eventListeners.set(eventName, callback);
    // Return different unlisten functions based on event name
    if (eventName === 'auth-state-changed') {
      return Promise.resolve(mockUnlistenAuthState);
    }
    return Promise.resolve(mockUnlistenReauthNeeded);
  }),
}));

describe('useAuthStateListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventListeners.clear();
    useAuthStore.setState({ isSignedIn: false, username: null, plan: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should setup listener for auth-state-changed event', async () => {
    const { listen } = await import('@tauri-apps/api/event');

    renderHook(() => useAuthStateListener());

    expect(listen).toHaveBeenCalledWith('auth-state-changed', expect.any(Function));
  });

  it('should setup listener for auth-reauth-needed event', async () => {
    const { listen } = await import('@tauri-apps/api/event');

    renderHook(() => useAuthStateListener());

    // Wait for both listeners to be set up
    await vi.waitFor(() => {
      expect(eventListeners.has('auth-reauth-needed')).toBe(true);
    });

    expect(listen).toHaveBeenCalledWith('auth-reauth-needed', expect.any(Function));
  });

  it('should update auth store when auth-state-changed event is received', async () => {
    renderHook(() => useAuthStateListener());

    // Simulate receiving an auth-state-changed event
    const callback = eventListeners.get('auth-state-changed');
    expect(callback).toBeDefined();

    act(() => {
      callback!({
        payload: {
          isSignedIn: true,
          username: 'testuser',
          plan: 'Pro Unlimited',
        },
      });
    });

    expect(useAuthStore.getState().isSignedIn).toBe(true);
    expect(useAuthStore.getState().username).toBe('testuser');
    expect(useAuthStore.getState().plan).toBe('Pro Unlimited');
  });

  it('should handle sign out event', async () => {
    // Start signed in
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });

    renderHook(() => useAuthStateListener());

    const callback = eventListeners.get('auth-state-changed');
    expect(callback).toBeDefined();

    act(() => {
      callback!({
        payload: {
          isSignedIn: false,
          username: null,
          plan: null,
        },
      });
    });

    expect(useAuthStore.getState().isSignedIn).toBe(false);
    expect(useAuthStore.getState().username).toBeNull();
    expect(useAuthStore.getState().plan).toBeNull();
  });

  it('should clear auth when auth-reauth-needed event is received', async () => {
    // Start signed in
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });

    renderHook(() => useAuthStateListener());

    // Wait for listener to be set up
    await vi.waitFor(() => {
      expect(eventListeners.has('auth-reauth-needed')).toBe(true);
    });

    const callback = eventListeners.get('auth-reauth-needed');
    expect(callback).toBeDefined();

    act(() => {
      callback!({});
    });

    expect(useAuthStore.getState().isSignedIn).toBe(false);
    expect(useAuthStore.getState().username).toBeNull();
  });

  it('should cleanup both listeners on unmount', async () => {
    const { unmount } = renderHook(() => useAuthStateListener());

    // Wait for listeners to be set up
    await vi.waitFor(() => {
      expect(eventListeners.has('auth-state-changed')).toBe(true);
      expect(eventListeners.has('auth-reauth-needed')).toBe(true);
    });

    unmount();

    // Both unlisten functions should be called
    expect(mockUnlistenAuthState).toHaveBeenCalled();
    expect(mockUnlistenReauthNeeded).toHaveBeenCalled();
  });
});
