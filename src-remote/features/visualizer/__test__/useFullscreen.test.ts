import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  exitAppFullscreen,
  isFullscreenSupported,
  isStandaloneWebApp,
  requestAppFullscreen,
  toggleAppFullscreen,
  useIsFullscreen,
} from '../hooks/useFullscreen';
import {
  changeFullscreenElement,
  enableFullscreen,
  mockFullscreenMethods,
  mockSupportedFullscreen,
  resetFullscreen,
  resetStandalone,
  setFullscreenElement,
  setStandalone,
} from './mockFullscreen';

describe('fullscreen helpers', () => {
  afterEach(resetFullscreen);

  it('does nothing when fullscreen is unsupported', () => {
    expect(() => requestAppFullscreen()).not.toThrow();
  });

  it('requests fullscreen on the document element when supported', () => {
    const { request } = mockSupportedFullscreen();
    requestAppFullscreen();
    expect(request).toHaveBeenCalled();
  });

  it('exits only while something is fullscreen', () => {
    const { exit } = mockFullscreenMethods();
    exitAppFullscreen();
    expect(exit).not.toHaveBeenCalled();
    setFullscreenElement(document.documentElement);
    exitAppFullscreen();
    expect(exit).toHaveBeenCalled();
  });

  it('reports support only when the API is enabled', () => {
    mockFullscreenMethods();
    expect(isFullscreenSupported()).toBe(false);
    enableFullscreen();
    expect(isFullscreenSupported()).toBe(true);
  });

  it('toggles between entering and leaving fullscreen', () => {
    const { request, exit } = mockSupportedFullscreen();
    toggleAppFullscreen();
    expect(request).toHaveBeenCalledTimes(1);
    expect(exit).not.toHaveBeenCalled();
    setFullscreenElement(document.documentElement);
    toggleAppFullscreen();
    expect(exit).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('useIsFullscreen', () => {
  afterEach(resetFullscreen);

  it('is false while nothing is fullscreen', () => {
    const { result } = renderHook(() => useIsFullscreen());
    expect(result.current).toBe(false);
  });

  it('follows fullscreenchange events', () => {
    const { result } = renderHook(() => useIsFullscreen());
    changeFullscreenElement(document.documentElement);
    expect(result.current).toBe(true);
    changeFullscreenElement(null);
    expect(result.current).toBe(false);
  });
});

describe('isStandaloneWebApp', () => {
  afterEach(() => {
    resetStandalone();
    vi.restoreAllMocks();
  });

  it('is false in a regular browser tab', () => {
    expect(isStandaloneWebApp()).toBe(false);
  });

  it('is true when iOS reports navigator.standalone', () => {
    setStandalone(true);
    expect(isStandaloneWebApp()).toBe(true);
  });

  it('is true when the display-mode media query matches', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({ matches: query === '(display-mode: standalone)' }) as MediaQueryList);
    expect(isStandaloneWebApp()).toBe(true);
  });
});
