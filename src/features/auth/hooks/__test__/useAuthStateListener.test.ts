import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStateListener } from '../useAuthStateListener';
import { useAuthStore } from '@/features/auth/store';

// Mock the auth api for listProfiles
vi.mock('@/features/auth/api', () => ({
  checkAuth: vi.fn(),
  listProfiles: vi
    .fn()
    .mockResolvedValue([
      { key: 'Chrome:Profile 1', browser: 'Chrome', profile: 'Profile 1', username: 'dj_cool', avatarUrl: null, plan: null },
    ]),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    trace: vi.fn().mockResolvedValue(undefined),
    debug: vi.fn().mockResolvedValue(undefined),
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Tauri event API
const mockUnlistenAuthState = vi.fn();
const mockUnlistenReauthNeeded = vi.fn();
const mockUnlistenProfileSelection = vi.fn();
let eventListeners: Map<string, (event: { payload?: unknown }) => void> = new Map();

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((eventName: string, callback: (event: { payload?: unknown }) => void) => {
    eventListeners.set(eventName, callback);
    if (eventName === 'auth-state-changed') {
      return Promise.resolve(mockUnlistenAuthState);
    }
    if (eventName === 'auth-profile-selection-needed') {
      return Promise.resolve(mockUnlistenProfileSelection);
    }
    return Promise.resolve(mockUnlistenReauthNeeded);
  }),
}));

describe('useAuthStateListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventListeners.clear();
    useAuthStore.setState({ isSignedIn: false, username: null, plan: null, isPickerOpen: false, profiles: [] });
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

    await vi.waitFor(() => {
      expect(eventListeners.has('auth-reauth-needed')).toBe(true);
    });

    expect(listen).toHaveBeenCalledWith('auth-reauth-needed', expect.any(Function));
  });

  it('should setup listener for auth-profile-selection-needed event', async () => {
    const { listen } = await import('@tauri-apps/api/event');

    renderHook(() => useAuthStateListener());

    await vi.waitFor(() => {
      expect(eventListeners.has('auth-profile-selection-needed')).toBe(true);
    });

    expect(listen).toHaveBeenCalledWith('auth-profile-selection-needed', expect.any(Function));
  });

  it('should update auth store when auth-state-changed event is received', async () => {
    renderHook(() => useAuthStateListener());

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
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });

    renderHook(() => useAuthStateListener());

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

  it('should open picker when auth-profile-selection-needed event is received', async () => {
    renderHook(() => useAuthStateListener());

    await vi.waitFor(() => {
      expect(eventListeners.has('auth-profile-selection-needed')).toBe(true);
    });

    const callback = eventListeners.get('auth-profile-selection-needed');
    expect(callback).toBeDefined();

    await act(async () => {
      await callback!({});
    });

    expect(useAuthStore.getState().isPickerOpen).toBe(true);
  });

  it('should cleanup all three listeners on unmount', async () => {
    const { unmount } = renderHook(() => useAuthStateListener());

    await vi.waitFor(() => {
      expect(eventListeners.has('auth-state-changed')).toBe(true);
      expect(eventListeners.has('auth-reauth-needed')).toBe(true);
      expect(eventListeners.has('auth-profile-selection-needed')).toBe(true);
    });

    unmount();

    expect(mockUnlistenAuthState).toHaveBeenCalled();
    expect(mockUnlistenReauthNeeded).toHaveBeenCalled();
    expect(mockUnlistenProfileSelection).toHaveBeenCalled();
  });
});
