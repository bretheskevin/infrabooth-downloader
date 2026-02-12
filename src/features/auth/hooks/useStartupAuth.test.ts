import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStartupAuth } from './useStartupAuth';

// Mock the auth module
vi.mock('@/features/auth/api', () => ({
  checkAuthState: vi.fn(),
}));

import { checkAuthState } from '@/features/auth/api';

describe('useStartupAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call checkAuthState on mount', async () => {
    vi.mocked(checkAuthState).mockResolvedValue(true);

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(checkAuthState).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle checkAuthState returning true (authenticated)', async () => {
    vi.mocked(checkAuthState).mockResolvedValue(true);

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(checkAuthState).toHaveBeenCalled();
    });
    // No error should be thrown
  });

  it('should handle checkAuthState returning false (not authenticated)', async () => {
    vi.mocked(checkAuthState).mockResolvedValue(false);

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(checkAuthState).toHaveBeenCalled();
    });
    // No error should be thrown
  });

  it('should log error when checkAuthState fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(checkAuthState).mockRejectedValue(new Error('Network error'));

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to check auth state on startup:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should only call checkAuthState once', async () => {
    vi.mocked(checkAuthState).mockResolvedValue(true);

    const { rerender } = renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(checkAuthState).toHaveBeenCalledTimes(1);
    });

    // Rerender should not call checkAuthState again
    rerender();

    expect(checkAuthState).toHaveBeenCalledTimes(1);
  });

  it('should not log error if component unmounts before checkAuthState resolves', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create a promise that we control
    let resolvePromise: (value: boolean) => void;
    const promise = new Promise<boolean>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(checkAuthState).mockReturnValue(promise);

    const { unmount } = renderHook(() => useStartupAuth());

    // Unmount before the promise resolves
    unmount();

    // Now resolve the promise
    resolvePromise!(true);

    // Wait a tick for any potential error handling
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should not have logged any error
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
