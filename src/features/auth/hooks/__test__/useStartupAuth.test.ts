import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStartupAuth } from '../useStartupAuth';

// Mock the auth module
vi.mock('@/features/auth/api', () => ({
  checkAuth: vi.fn(),
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

import { checkAuth } from '@/features/auth/api';
import { logger } from '@/lib/logger';

describe('useStartupAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call checkAuth on mount', async () => {
    vi.mocked(checkAuth).mockResolvedValue(true);

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(checkAuth).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle checkAuth returning true (authenticated)', async () => {
    vi.mocked(checkAuth).mockResolvedValue(true);

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(checkAuth).toHaveBeenCalled();
    });
    // No error should be thrown
  });

  it('should handle checkAuth returning false (not authenticated)', async () => {
    vi.mocked(checkAuth).mockResolvedValue(false);

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(checkAuth).toHaveBeenCalled();
    });
    // No error should be thrown
  });

  it('should log error when checkAuth fails', async () => {
    vi.mocked(checkAuth).mockRejectedValue(new Error('Network error'));

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to check auth state on startup: Network error'
      );
    });
  });

  it('should only call checkAuth once', async () => {
    vi.mocked(checkAuth).mockResolvedValue(true);

    const { rerender } = renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(checkAuth).toHaveBeenCalledTimes(1);
    });

    // Rerender should not call checkAuth again
    rerender();

    expect(checkAuth).toHaveBeenCalledTimes(1);
  });

  it('should not log error if component unmounts before checkAuth resolves', async () => {
    // Create a promise that we control
    let resolvePromise: (value: boolean) => void;
    const promise = new Promise<boolean>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(checkAuth).mockReturnValue(promise);

    const { unmount } = renderHook(() => useStartupAuth());

    // Unmount before the promise resolves
    unmount();

    // Now resolve the promise
    resolvePromise!(true);

    // Wait a tick for any potential error handling
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should not have logged any error
    expect(logger.error).not.toHaveBeenCalled();
  });
});
