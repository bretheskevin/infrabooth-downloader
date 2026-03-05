import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAuth, refreshAuth, signOut } from '../api';

// Mock the Tauri API layer
vi.mock('@/lib/tauri', () => ({
  api: {
    checkAuth: vi.fn(),
    refreshAuth: vi.fn(),
    signOut: vi.fn(),
  },
}));

import { api } from '@/lib/tauri';

describe('auth api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAuth', () => {
    it('should call api.checkAuth and return true when authenticated', async () => {
      vi.mocked(api.checkAuth).mockResolvedValue(true);

      const result = await checkAuth();

      expect(api.checkAuth).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('should call api.checkAuth and return false when not authenticated', async () => {
      vi.mocked(api.checkAuth).mockResolvedValue(false);

      const result = await checkAuth();

      expect(api.checkAuth).toHaveBeenCalledTimes(1);
      expect(result).toBe(false);
    });

    it('should throw when the check fails', async () => {
      vi.mocked(api.checkAuth).mockRejectedValue(new Error('Cookie scan failed'));

      await expect(checkAuth()).rejects.toThrow('Cookie scan failed');
    });
  });

  describe('refreshAuth', () => {
    it('should call api.refreshAuth and return true when authenticated', async () => {
      vi.mocked(api.refreshAuth).mockResolvedValue(true);

      const result = await refreshAuth();

      expect(api.refreshAuth).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('should call api.refreshAuth and return false when not authenticated', async () => {
      vi.mocked(api.refreshAuth).mockResolvedValue(false);

      const result = await refreshAuth();

      expect(api.refreshAuth).toHaveBeenCalledTimes(1);
      expect(result).toBe(false);
    });

    it('should throw when the refresh fails', async () => {
      vi.mocked(api.refreshAuth).mockRejectedValue(new Error('Refresh failed'));

      await expect(refreshAuth()).rejects.toThrow('Refresh failed');
    });
  });

  describe('signOut', () => {
    it('should call api.signOut', async () => {
      vi.mocked(api.signOut).mockResolvedValue(undefined);

      await signOut();

      expect(api.signOut).toHaveBeenCalledTimes(1);
    });

    it('should throw when sign-out fails', async () => {
      vi.mocked(api.signOut).mockRejectedValue(new Error('Sign-out failed'));

      await expect(signOut()).rejects.toThrow('Sign-out failed');
    });
  });
});
