import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useWaveformCanvas } from '@/lib/useWaveformCanvas';
import { drawWaveform } from '@/lib/waveform';

vi.mock('@/lib/waveform', () => ({
  drawWaveform: vi.fn(),
}));

describe('useWaveformCanvas', () => {
  let observeTarget: Element | null = null;
  let disconnected = false;
  let triggerResize: ((entries: ResizeObserverEntry[]) => void) | null = null;

  beforeEach(() => {
    observeTarget = null;
    disconnected = false;
    triggerResize = null;

    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: ResizeObserverCallback) {
          triggerResize = (entries) => cb(entries, this as unknown as ResizeObserver);
        }
        observe(el: Element) {
          observeTarget = el;
        }
        disconnect() {
          disconnected = true;
        }
        unobserve() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.mocked(drawWaveform).mockClear();
  });

  it('observes the canvas element on mount', () => {
    const canvas = document.createElement('canvas');
    renderHook(() => {
      const ref = useRef<HTMLCanvasElement | null>(canvas);
      useWaveformCanvas(ref, { samples: [], progress: 0 });
    });
    expect(observeTarget).toBe(canvas);
  });

  it('disconnects the ResizeObserver on unmount', () => {
    const canvas = document.createElement('canvas');
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLCanvasElement | null>(canvas);
      useWaveformCanvas(ref, { samples: [], progress: 0 });
    });
    unmount();
    expect(disconnected).toBe(true);
  });

  it('calls drawWaveform with correct colors and options after resize', () => {
    const canvas = document.createElement('canvas');
    const mockCtx = { clearRect: vi.fn(), fillStyle: '', fillRect: vi.fn(), scale: vi.fn() };
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      width: 300,
      height: 48,
      top: 0,
      left: 0,
      right: 300,
      bottom: 48,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (prop: string) => {
        if (prop === '--primary') return '221 83% 53%';
        if (prop === '--muted-foreground') return '215 16% 47%';
        return '';
      },
    } as unknown as CSSStyleDeclaration);

    renderHook(() => {
      const ref = useRef<HTMLCanvasElement | null>(canvas);
      useWaveformCanvas(ref, { samples: [0.5, 0.8], progress: 0.4 });
    });

    act(() => {
      triggerResize!([{ contentRect: { width: 300, height: 48 } } as ResizeObserverEntry]);
    });

    expect(vi.mocked(drawWaveform)).toHaveBeenCalledWith(
      mockCtx,
      [0.5, 0.8],
      expect.objectContaining({
        progress: 0.4,
        width: 300,
        height: 48,
        playedColor: 'hsl(221 83% 53%)',
        barColor: 'hsl(215 16% 47% / 0.4)',
      }),
    );
  });

  it('uses fallback values when CSS vars are empty', () => {
    const canvas = document.createElement('canvas');
    const mockCtx = { clearRect: vi.fn(), fillStyle: '', fillRect: vi.fn(), scale: vi.fn() };
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 24,
      top: 0,
      left: 0,
      right: 100,
      bottom: 24,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '',
    } as unknown as CSSStyleDeclaration);

    renderHook(() => {
      const ref = useRef<HTMLCanvasElement | null>(canvas);
      useWaveformCanvas(ref, {
        samples: [0.5],
        progress: 0,
        primaryFallback: '10 50% 60%',
        mutedFallback: '20 30% 40%',
      });
    });

    act(() => {
      triggerResize!([{ contentRect: { width: 100, height: 24 } } as ResizeObserverEntry]);
    });

    expect(vi.mocked(drawWaveform)).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        playedColor: 'hsl(10 50% 60%)',
        barColor: 'hsl(20 30% 40% / 0.4)',
      }),
    );
  });

  it('does not call drawWaveform when samples is empty', () => {
    const canvas = document.createElement('canvas');

    renderHook(() => {
      const ref = useRef<HTMLCanvasElement | null>(canvas);
      useWaveformCanvas(ref, { samples: [], progress: 0 });
    });

    act(() => {
      triggerResize!([{ contentRect: { width: 300, height: 48 } } as ResizeObserverEntry]);
    });

    expect(vi.mocked(drawWaveform)).not.toHaveBeenCalled();
  });

  it('passes hoverProgress to drawWaveform when provided', () => {
    const canvas = document.createElement('canvas');
    const mockCtx = { clearRect: vi.fn(), fillStyle: '', fillRect: vi.fn(), scale: vi.fn() };
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 32,
      top: 0,
      left: 0,
      right: 200,
      bottom: 32,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '',
    } as unknown as CSSStyleDeclaration);

    renderHook(() => {
      const ref = useRef<HTMLCanvasElement | null>(canvas);
      useWaveformCanvas(ref, {
        samples: [0.5],
        progress: 0.2,
        hoverProgress: 0.6,
        primaryFallback: '221 83% 53%',
        mutedFallback: '215 16% 47%',
      });
    });

    act(() => {
      triggerResize!([{ contentRect: { width: 200, height: 32 } } as ResizeObserverEntry]);
    });

    expect(vi.mocked(drawWaveform)).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        hoverProgress: 0.6,
        hoverBarColor: 'hsl(215 16% 47% / 0.6)',
      }),
    );
  });
});
