import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRemoteTheme } from '../useRemoteTheme';

const isDark = () => document.documentElement.classList.contains('dark');

describe('useRemoteTheme', () => {
  beforeEach(() => {
    document.documentElement.className = 'dark';
  });

  it('follows the desktop theme', () => {
    renderHook(() => useRemoteTheme('light', false));
    expect(isDark()).toBe(false);
  });

  it('forces dark mode while the visualizer is open and restores the desktop theme after', () => {
    const { rerender } = renderHook(({ forceDark }) => useRemoteTheme('light', forceDark), {
      initialProps: { forceDark: true },
    });
    expect(isDark()).toBe(true);

    rerender({ forceDark: false });
    expect(isDark()).toBe(false);
  });
});
