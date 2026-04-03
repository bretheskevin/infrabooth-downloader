import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUpdateCheck } from '../useUpdateCheck';
import { useUpdateStore } from '../../store';

// Mock the bindings module
vi.mock('@/bindings', () => ({
  commands: {
    checkForUpdates: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
  },
}));

const POLL_INTERVAL_MS = 10 * 60 * 1000;

describe('useUpdateCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useUpdateStore.setState({
      updateAvailable: false,
      updateInfo: null,
      checkInProgress: false,
      lastChecked: null,
      dismissed: false,
    });
  });

  it('should trigger checkForUpdates on mount', () => {
    const checkSpy = vi.spyOn(useUpdateStore.getState(), 'checkForUpdates');

    renderHook(() => useUpdateCheck());

    expect(checkSpy).toHaveBeenCalledTimes(1);
  });

  it('should return updateAvailable from store', () => {
    useUpdateStore.setState({ updateAvailable: true });

    const { result } = renderHook(() => useUpdateCheck());

    expect(result.current.updateAvailable).toBe(true);
  });

  it('should return updateInfo from store', () => {
    const info = { version: '2.0.0', body: 'notes', date: '2026-01-01' };
    useUpdateStore.setState({ updateInfo: info });

    const { result } = renderHook(() => useUpdateCheck());

    expect(result.current.updateInfo).toEqual(info);
  });

  it('should return isChecking from store', () => {
    useUpdateStore.setState({ checkInProgress: true });

    const { result } = renderHook(() => useUpdateCheck());

    expect(result.current.isChecking).toBe(true);
  });

  it('should not call checkForUpdates again on rerender', () => {
    const checkSpy = vi.spyOn(useUpdateStore.getState(), 'checkForUpdates');

    const { rerender } = renderHook(() => useUpdateCheck());
    rerender();

    expect(checkSpy).toHaveBeenCalledTimes(1);
  });

  describe('polling', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should poll for updates every 10 minutes', () => {
      const checkSpy = vi.spyOn(useUpdateStore.getState(), 'checkForUpdates');

      renderHook(() => useUpdateCheck());
      expect(checkSpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(POLL_INTERVAL_MS);
      expect(checkSpy).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(POLL_INTERVAL_MS);
      expect(checkSpy).toHaveBeenCalledTimes(3);
    });

    it('should stop polling when update is available', () => {
      const checkSpy = vi.spyOn(useUpdateStore.getState(), 'checkForUpdates');

      const { rerender } = renderHook(() => useUpdateCheck());
      expect(checkSpy).toHaveBeenCalledTimes(1);

      useUpdateStore.setState({ updateAvailable: true });
      rerender();

      vi.advanceTimersByTime(POLL_INTERVAL_MS);
      expect(checkSpy).toHaveBeenCalledTimes(1);
    });

    it('should clean up interval on unmount', () => {
      const checkSpy = vi.spyOn(useUpdateStore.getState(), 'checkForUpdates');

      const { unmount } = renderHook(() => useUpdateCheck());
      expect(checkSpy).toHaveBeenCalledTimes(1);

      unmount();

      vi.advanceTimersByTime(POLL_INTERVAL_MS);
      expect(checkSpy).toHaveBeenCalledTimes(1);
    });
  });
});
