import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock @tauri-apps/api/app
const mockGetVersion = vi.fn().mockResolvedValue('1.6.0');
vi.mock('@tauri-apps/api/app', () => ({
  getVersion: () => mockGetVersion(),
}));

describe('useAppVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module-level cache between tests
    vi.resetModules();
  });

  it('should return the app version', async () => {
    const { useAppVersion } = await import('../useAppVersion');
    const { result } = renderHook(() => useAppVersion());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current).toBe('1.6.0');
  });

  it('should call getVersion only once across multiple hook instances', async () => {
    const { useAppVersion } = await import('../useAppVersion');

    const { result: result1 } = renderHook(() => useAppVersion());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result1.current).toBe('1.6.0');
    expect(mockGetVersion).toHaveBeenCalledTimes(1);

    // Second instance should use cached value
    const { result: result2 } = renderHook(() => useAppVersion());
    expect(result2.current).toBe('1.6.0');
    expect(mockGetVersion).toHaveBeenCalledTimes(1);
  });

  it('should return empty string initially before version loads', async () => {
    const { useAppVersion } = await import('../useAppVersion');
    const { result } = renderHook(() => useAppVersion());

    // Before the async call resolves
    expect(result.current).toBe('');

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current).toBe('1.6.0');
  });
});
