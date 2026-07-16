import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStartupAuth } from '../useStartupAuth';
import { useAuthStore } from '@/features/auth/store';

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
    useAuthStore.setState({ selectedProfileKey: null });
  });

  it('should call checkAuth with null profile key on mount', async () => {
    vi.mocked(checkAuth).mockResolvedValue(true);

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(checkAuth).toHaveBeenCalledWith(null);
    });
  });

  it('should call checkAuth with persisted profile key', async () => {
    vi.mocked(checkAuth).mockResolvedValue(true);
    useAuthStore.setState({ selectedProfileKey: 'Chrome:Profile 1' });

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(checkAuth).toHaveBeenCalledWith('Chrome:Profile 1');
    });
  });

  it('should handle checkAuth returning true (authenticated)', async () => {
    vi.mocked(checkAuth).mockResolvedValue(true);

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(checkAuth).toHaveBeenCalled();
    });
  });

  it('should handle checkAuth returning false (not authenticated)', async () => {
    vi.mocked(checkAuth).mockResolvedValue(false);

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(checkAuth).toHaveBeenCalled();
    });
  });

  it('should log error when checkAuth fails', async () => {
    vi.mocked(checkAuth).mockRejectedValue(new Error('Network error'));

    renderHook(() => useStartupAuth());

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith('Failed to check auth state on startup: Network error');
    });
  });

  it('should not log error if component unmounts before checkAuth resolves', async () => {
    let resolvePromise: (value: boolean) => void;
    const promise = new Promise<boolean>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(checkAuth).mockReturnValue(promise);

    const { unmount } = renderHook(() => useStartupAuth());

    unmount();

    resolvePromise!(true);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(logger.error).not.toHaveBeenCalled();
  });
});
