import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOAuthFlow } from './useOAuthFlow';
import * as auth from '@/features/auth/api';

// Mock Tauri event API
let authCallbackHandler: ((event: { payload: string }) => void) | null = null;

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((eventName: string, callback: (event: { payload: string }) => void) => {
    if (eventName === 'auth-callback') {
      authCallbackHandler = callback;
    }
    return Promise.resolve(vi.fn());
  }),
}));

// Mock auth module
vi.mock('@/features/auth/api', () => ({
  completeOAuth: vi.fn(),
}));

describe('useOAuthFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authCallbackHandler = null;
  });

  it('should setup listener for auth-callback event', async () => {
    const { listen } = await import('@tauri-apps/api/event');

    renderHook(() => useOAuthFlow());

    expect(listen).toHaveBeenCalledWith('auth-callback', expect.any(Function));
  });

  it('should call completeOAuth when auth-callback event is received', async () => {
    vi.mocked(auth.completeOAuth).mockResolvedValue();

    renderHook(() => useOAuthFlow());

    // Wait for listener to be set up
    await waitFor(() => {
      expect(authCallbackHandler).not.toBeNull();
    });

    // Simulate receiving an auth-callback event
    await act(async () => {
      authCallbackHandler!({ payload: 'test-auth-code' });
    });

    expect(auth.completeOAuth).toHaveBeenCalledWith('test-auth-code');
  });

  it('should handle errors from completeOAuth gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(auth.completeOAuth).mockRejectedValue(new Error('Token exchange failed'));

    renderHook(() => useOAuthFlow());

    // Wait for listener to be set up
    await waitFor(() => {
      expect(authCallbackHandler).not.toBeNull();
    });

    // Simulate receiving an auth-callback event
    await act(async () => {
      authCallbackHandler!({ payload: 'invalid-code' });
    });

    expect(consoleSpy).toHaveBeenCalledWith('[useOAuthFlow] OAuth completion failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
