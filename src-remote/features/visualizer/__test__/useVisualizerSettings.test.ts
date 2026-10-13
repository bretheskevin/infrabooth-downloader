import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { DEFAULT_VISUALIZER_SETTINGS } from '@/lib/remote-protocol';
import { useVisualizerSettings } from '../hooks/useVisualizerSettings';

describe('useVisualizerSettings', () => {
  it('falls back to defaults before the first state arrives', () => {
    const { result } = renderHook(() => useVisualizerSettings(null, vi.fn()));
    expect(result.current[0]).toEqual(DEFAULT_VISUALIZER_SETTINGS);
  });

  it('reads the settings pushed by the desktop', () => {
    const visualizer = { ...DEFAULT_VISUALIZER_SETTINGS, style: 'radial' as const };
    const { result } = renderHook(() => useVisualizerSettings({ visualizer }, vi.fn()));
    expect(result.current[0]).toBe(visualizer);
  });

  it('sends the new settings to the desktop instead of storing them', () => {
    const send = vi.fn();
    const { result } = renderHook(() => useVisualizerSettings(null, send));
    const next = { ...DEFAULT_VISUALIZER_SETTINGS, style: 'wave' as const };
    act(() => result.current[1](next));
    expect(send).toHaveBeenCalledWith({ type: 'setVisualizerSettings', settings: next });
    expect(result.current[0]).toEqual(DEFAULT_VISUALIZER_SETTINGS);
  });
});
