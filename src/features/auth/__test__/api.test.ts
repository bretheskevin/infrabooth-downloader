import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAuth, refreshAuth, signOut, listProfiles } from '../api';

// Mock the Tauri API layer
vi.mock('@/lib/tauri', () => ({
  api: {
    checkAuth: vi.fn(),
    refreshAuth: vi.fn(),
    signOut: vi.fn(),
    listProfiles: vi.fn(),
  },
}));

import { api } from '@/lib/tauri';

describe('auth api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAuth', () => {
    it('should call api.checkAuth with null profile key by default', async () => {
      vi.mocked(api.checkAuth).mockResolvedValue(true);

      const result = await checkAuth();

      expect(api.checkAuth).toHaveBeenCalledWith(null);
      expect(result).toBe(true);
    });

    it('should call api.checkAuth with provided profile key', async () => {
      vi.mocked(api.checkAuth).mockResolvedValue(true);

      const result = await checkAuth('Chrome:Profile 1');

      expect(api.checkAuth).toHaveBeenCalledWith('Chrome:Profile 1');
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

  describe('listProfiles', () => {
    it('should call api.listProfiles and return profiles', async () => {
      const mockProfiles = [
        { key: 'Chrome:Profile 1', browser: 'Chrome', profile: 'Profile 1', username: 'dj_cool', avatarUrl: null, plan: null },
      ];
      vi.mocked(api.listProfiles).mockResolvedValue(mockProfiles);

      const result = await listProfiles();

      expect(api.listProfiles).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockProfiles);
    });

    it('should throw when listProfiles fails', async () => {
      vi.mocked(api.listProfiles).mockRejectedValue(new Error('Failed to list profiles'));

      await expect(listProfiles()).rejects.toThrow('Failed to list profiles');
    });
  });
});
