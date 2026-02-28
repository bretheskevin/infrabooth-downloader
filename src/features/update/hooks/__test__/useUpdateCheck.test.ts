import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUpdateCheck } from '../useUpdateCheck';
import { useUpdateStore } from '../../store';

// Mock the bindings module
vi.mock('@/bindings', () => ({
  commands: {
    checkForUpdates: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
  },
}));

describe('useUpdateCheck', () => {
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
});
