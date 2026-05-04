import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUpdateStore } from '../store';

// Mock the bindings module
vi.mock('@/bindings', () => ({
  commands: {
    checkForUpdates: vi.fn(),
    installUpdate: vi.fn(),
  },
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

import { commands } from '@/bindings';
import { logger } from '@/lib/logger';

const mockCheckForUpdates = vi.mocked(commands.checkForUpdates);
const mockInstallUpdate = vi.mocked(commands.installUpdate);

describe('updateStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUpdateStore.setState({
      updateAvailable: false,
      updateInfo: null,
      checkInProgress: false,
      lastChecked: null,
      dismissed: false,
      installing: false,
      installError: null,
      installed: false,
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
      mockCheckForUpdates.mockRejectedValue(new Error('Network error'));

      await useUpdateStore.getState().checkForUpdates();

      const state = useUpdateStore.getState();
      expect(state.updateAvailable).toBe(false);
      expect(state.updateInfo).toBeNull();
      expect(state.checkInProgress).toBe(false);
      expect(state.lastChecked).toBeInstanceOf(Date);
    });

    it('should use logger.warn (not error) for check failures', async () => {
      mockCheckForUpdates.mockRejectedValue(new Error('Network error'));

      await useUpdateStore.getState().checkForUpdates();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[Update] Check failed:'));
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should prevent concurrent checks', async () => {
      let resolveFirst: (value: unknown) => void;
      const firstCall = new Promise((resolve) => {
        resolveFirst = resolve;
      });
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
      const checkPromise = new Promise((resolve) => {
        resolveCheck = resolve;
      });
      mockCheckForUpdates.mockReturnValue(checkPromise as never);

      const promise = useUpdateStore.getState().checkForUpdates();
      expect(useUpdateStore.getState().checkInProgress).toBe(true);

      resolveCheck!({ status: 'ok', data: null });
      await promise;

      expect(useUpdateStore.getState().checkInProgress).toBe(false);
    });

    it('should not interact with changelog store on update detection', async () => {
      const { useChangelogStore } = await import('@/features/changelog/store');
      const initialState = useChangelogStore.getState();

      const updateInfo = { version: '2.0.0', body: 'New features', date: '2026-01-01' };
      mockCheckForUpdates.mockResolvedValue({ status: 'ok', data: updateInfo });

      await useUpdateStore.getState().checkForUpdates();

      const afterState = useChangelogStore.getState();
      expect(afterState.lastSeenVersion).toBe(initialState.lastSeenVersion);
    });

    it('should log update available message', async () => {
      const updateInfo = { version: '2.0.0', body: null, date: null };
      mockCheckForUpdates.mockResolvedValue({ status: 'ok', data: updateInfo });

      await useUpdateStore.getState().checkForUpdates();

      expect(logger.info).toHaveBeenCalledWith('[Update] Checking for updates...');
      expect(logger.info).toHaveBeenCalledWith('[Update] New version available: 2.0.0');
    });

    it('should log up to date message', async () => {
      mockCheckForUpdates.mockResolvedValue({ status: 'ok', data: null });

      await useUpdateStore.getState().checkForUpdates();

      expect(logger.info).toHaveBeenCalledWith('[Update] App is up to date');
    });

    it('should log failure message', async () => {
      mockCheckForUpdates.mockRejectedValue(new Error('timeout'));

      await useUpdateStore.getState().checkForUpdates();

      expect(logger.warn).toHaveBeenCalledWith('[Update] Check failed: timeout');
    });
  });

  describe('installUpdate', () => {
    it('should set installed on success', async () => {
      mockInstallUpdate.mockResolvedValue({ status: 'ok', data: null });

      await useUpdateStore.getState().installUpdate();

      const state = useUpdateStore.getState();
      expect(state.installing).toBe(false);
      expect(state.installed).toBe(true);
      expect(state.installError).toBeNull();
    });

    it('should set installError on error result', async () => {
      mockInstallUpdate.mockResolvedValue({ status: 'error', error: 'Download failed' });

      await useUpdateStore.getState().installUpdate();

      const state = useUpdateStore.getState();
      expect(state.installing).toBe(false);
      expect(state.installed).toBe(false);
      expect(state.installError).toBe('Download failed');
    });

    it('should set installError on exception', async () => {
      mockInstallUpdate.mockRejectedValue(new Error('Network failure'));

      await useUpdateStore.getState().installUpdate();

      const state = useUpdateStore.getState();
      expect(state.installing).toBe(false);
      expect(state.installed).toBe(false);
      expect(state.installError).toBe('Network failure');
    });

    it('should set installing during installation', async () => {
      let resolveInstall: (value: unknown) => void;
      const installPromise = new Promise((resolve) => {
        resolveInstall = resolve;
      });
      mockInstallUpdate.mockReturnValue(installPromise as never);

      const promise = useUpdateStore.getState().installUpdate();
      expect(useUpdateStore.getState().installing).toBe(true);

      resolveInstall!({ status: 'ok', data: null });
      await promise;

      expect(useUpdateStore.getState().installing).toBe(false);
    });

    it('should prevent concurrent installations', async () => {
      let resolveFirst: (value: unknown) => void;
      const firstCall = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      mockInstallUpdate.mockReturnValueOnce(firstCall as never);

      const firstPromise = useUpdateStore.getState().installUpdate();
      await useUpdateStore.getState().installUpdate();

      expect(mockInstallUpdate).toHaveBeenCalledTimes(1);

      resolveFirst!({ status: 'ok', data: null });
      await firstPromise;
    });

    it('should clear previous error on retry', async () => {
      useUpdateStore.setState({ installError: 'Previous error' });
      mockInstallUpdate.mockResolvedValue({ status: 'ok', data: null });

      await useUpdateStore.getState().installUpdate();

      expect(useUpdateStore.getState().installError).toBeNull();
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
