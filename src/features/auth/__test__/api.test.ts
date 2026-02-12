import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startOAuth, completeOAuth, checkAuthState, signOut } from '../api';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startOAuth', () => {
    it('should invoke start_oauth and open the returned URL', async () => {
      const mockAuthUrl = 'https://api.soundcloud.com/connect?client_id=test';
      vi.mocked(invoke).mockResolvedValue(mockAuthUrl);

      await startOAuth();

      expect(invoke).toHaveBeenCalledWith('start_oauth');
      expect(open).toHaveBeenCalledWith(mockAuthUrl);
    });

    it('should throw when backend fails', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Backend error'));

      await expect(startOAuth()).rejects.toThrow('Backend error');
    });

    it('should throw when browser open fails', async () => {
      vi.mocked(invoke).mockResolvedValue('https://example.com');
      vi.mocked(open).mockRejectedValue(new Error('Failed to open browser'));

      await expect(startOAuth()).rejects.toThrow('Failed to open browser');
    });
  });

  describe('completeOAuth', () => {
    it('should invoke complete_oauth with the provided code', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await completeOAuth('auth_code_123');

      expect(invoke).toHaveBeenCalledWith('complete_oauth', { code: 'auth_code_123' });
    });

    it('should throw when token exchange fails', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Token exchange failed'));

      await expect(completeOAuth('invalid_code')).rejects.toThrow('Token exchange failed');
    });
  });

  describe('checkAuthState', () => {
    it('should invoke check_auth_state and return true when authenticated', async () => {
      vi.mocked(invoke).mockResolvedValue(true);

      const result = await checkAuthState();

      expect(invoke).toHaveBeenCalledWith('check_auth_state');
      expect(result).toBe(true);
    });

    it('should invoke check_auth_state and return false when not authenticated', async () => {
      vi.mocked(invoke).mockResolvedValue(false);

      const result = await checkAuthState();

      expect(invoke).toHaveBeenCalledWith('check_auth_state');
      expect(result).toBe(false);
    });

    it('should throw when the check fails', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Keychain error'));

      await expect(checkAuthState()).rejects.toThrow('Keychain error');
    });
  });

  describe('signOut', () => {
    it('should invoke sign_out command', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await signOut();

      expect(invoke).toHaveBeenCalledWith('sign_out');
    });

    it('should throw when sign-out fails', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Keychain deletion failed'));

      await expect(signOut()).rejects.toThrow('Keychain deletion failed');
    });
  });
});
