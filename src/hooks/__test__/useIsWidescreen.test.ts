import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsWidescreen } from "../useIsWidescreen";

describe("useIsWidescreen", () => {
  let listeners: Array<(e: { matches: boolean }) => void>;
  let currentMatches: boolean;

  beforeEach(() => {
    listeners = [];
    currentMatches = false;

    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
      expect(query).toBe("(min-width: 1200px)");
      return {
        matches: currentMatches,
        media: query,
        onchange: null,
        addEventListener: (
          _event: string,
          handler: (e: { matches: boolean }) => void,
        ) => {
          listeners.push(handler);
        },
        removeEventListener: (
          _event: string,
          handler: (e: { matches: boolean }) => void,
        ) => {
          listeners = listeners.filter((l) => l !== handler);
        },
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return false when viewport is narrow", () => {
    currentMatches = false;
    const { result } = renderHook(() => useIsWidescreen());
    expect(result.current).toBe(false);
  });

  it("should return true when viewport is wide", () => {
    currentMatches = true;
    const { result } = renderHook(() => useIsWidescreen());
    expect(result.current).toBe(true);
  });

  it("should update when media query changes", () => {
    currentMatches = false;
    const { result } = renderHook(() => useIsWidescreen());
    expect(result.current).toBe(false);

    act(() => {
      currentMatches = true;
      for (const listener of listeners) {
        listener({ matches: true });
      }
    });

    expect(result.current).toBe(true);
  });

  it("should clean up listener on unmount", () => {
    currentMatches = false;
    const { unmount } = renderHook(() => useIsWidescreen());
    expect(listeners).toHaveLength(1);

    unmount();
    expect(listeners).toHaveLength(0);
  });
});
