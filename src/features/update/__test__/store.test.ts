import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUpdateStore } from '../store';

// Mock the bindings module
vi.mock('@/bindings', () => ({
  commands: {
    checkForUpdates: vi.fn(),
  },
}));

import { commands } from '@/bindings';

const mockCheckForUpdates = vi.mocked(commands.checkForUpdates);

describe('updateStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUpdateStore.setState({
      updateAvailable: false,
      updateInfo: null,
      checkInProgress: false,
      lastChecked: null,
      dismissed: false,
    });
  });

  describe('initial state', () => {
    it('should have updateAvailable as false', () => {
      expect(useUpdateStore.getState().updateAvailable).toBe(false);
    });

    it('should have updateInfo as null', () => {
      expect(useUpdateStore.getState().updateInfo).toBeNull();
    });

    it('should have checkInProgress as false', () => {
      expect(useUpdateStore.getState().checkInProgress).toBe(false);
    });

    it('should have lastChecked as null', () => {
      expect(useUpdateStore.getState().lastChecked).toBeNull();
    });

    it('should have dismissed as false', () => {
      expect(useUpdateStore.getState().dismissed).toBe(false);
    });
  });

  describe('checkForUpdates', () => {
    it('should set updateAvailable when update exists', async () => {
      const updateInfo = { version: '2.0.0', body: 'New features', date: '2026-01-01' };
      mockCheckForUpdates.mockResolvedValue({ status: 'ok', data: updateInfo });

      await useUpdateStore.getState().checkForUpdates();

      const state = useUpdateStore.getState();
      expect(state.updateAvailable).toBe(true);
      expect(state.updateInfo).toEqual(updateInfo);
      expect(state.checkInProgress).toBe(false);
      expect(state.lastChecked).toBeInstanceOf(Date);
    });

    it('should set updateAvailable false when no update', async () => {
      mockCheckForUpdates.mockResolvedValue({ status: 'ok', data: null });

      await useUpdateStore.getState().checkForUpdates();

      const state = useUpdateStore.getState();
      expect(state.updateAvailable).toBe(false);
      expect(state.updateInfo).toBeNull();
      expect(state.checkInProgress).toBe(false);
      expect(state.lastChecked).toBeInstanceOf(Date);
    });

    it('should handle errors silently', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockCheckForUpdates.mockRejectedValue(new Error('Network error'));

      await useUpdateStore.getState().checkForUpdates();

      const state = useUpdateStore.getState();
      expect(state.updateAvailable).toBe(false);
      expect(state.updateInfo).toBeNull();
      expect(state.checkInProgress).toBe(false);
      expect(state.lastChecked).toBeInstanceOf(Date);

      consoleSpy.mockRestore();
    });

    it('should not use console.error for failures', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockCheckForUpdates.mockRejectedValue(new Error('Network error'));

      await useUpdateStore.getState().checkForUpdates();

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should prevent concurrent checks', async () => {
      let resolveFirst: (value: unknown) => void;
      const firstCall = new Promise((resolve) => { resolveFirst = resolve; });
      mockCheckForUpdates.mockReturnValueOnce(firstCall as never);

      // Start first check
      const firstPromise = useUpdateStore.getState().checkForUpdates();
      expect(useUpdateStore.getState().checkInProgress).toBe(true);

      // Try second check while first is in progress
      await useUpdateStore.getState().checkForUpdates();

      // Only one call should have been made
      expect(mockCheckForUpdates).toHaveBeenCalledTimes(1);

      // Resolve first call
      resolveFirst!({ status: 'ok', data: null });
      await firstPromise;
    });

    it('should set checkInProgress during check', async () => {
      let resolveCheck: (value: unknown) => void;
      const checkPromise = new Promise((resolve) => { resolveCheck = resolve; });
      mockCheckForUpdates.mockReturnValue(checkPromise as never);

      const promise = useUpdateStore.getState().checkForUpdates();
      expect(useUpdateStore.getState().checkInProgress).toBe(true);

      resolveCheck!({ status: 'ok', data: null });
      await promise;

      expect(useUpdateStore.getState().checkInProgress).toBe(false);
    });

    it('should log update available message', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const updateInfo = { version: '2.0.0', body: null, date: null };
      mockCheckForUpdates.mockResolvedValue({ status: 'ok', data: updateInfo });

      await useUpdateStore.getState().checkForUpdates();

      expect(consoleSpy).toHaveBeenCalledWith('[Update] Checking for updates...');
      expect(consoleSpy).toHaveBeenCalledWith('[Update] New version available: 2.0.0');

      consoleSpy.mockRestore();
    });

    it('should log up to date message', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockCheckForUpdates.mockResolvedValue({ status: 'ok', data: null });

      await useUpdateStore.getState().checkForUpdates();

      expect(consoleSpy).toHaveBeenCalledWith('[Update] App is up to date');

      consoleSpy.mockRestore();
    });

    it('should log failure message', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockCheckForUpdates.mockRejectedValue(new Error('timeout'));

      await useUpdateStore.getState().checkForUpdates();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Update] Check failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('dismissUpdate', () => {
    it('should set dismissed to true', () => {
      useUpdateStore.getState().dismissUpdate();
      expect(useUpdateStore.getState().dismissed).toBe(true);
    });

    it('should not clear updateInfo on dismiss', () => {
      const updateInfo = { version: '2.0.0', body: null, date: null };
      useUpdateStore.setState({ updateAvailable: true, updateInfo });

      useUpdateStore.getState().dismissUpdate();

      expect(useUpdateStore.getState().updateInfo).toEqual(updateInfo);
      expect(useUpdateStore.getState().updateAvailable).toBe(true);
    });
  });

  describe('clearUpdateInfo', () => {
    it('should reset update state', () => {
      useUpdateStore.setState({
        updateAvailable: true,
        updateInfo: { version: '2.0.0', body: null, date: null },
        dismissed: true,
      });

      useUpdateStore.getState().clearUpdateInfo();

      const state = useUpdateStore.getState();
      expect(state.updateAvailable).toBe(false);
      expect(state.updateInfo).toBeNull();
      expect(state.dismissed).toBe(false);
    });
  });
});
