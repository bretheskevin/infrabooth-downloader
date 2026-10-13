import { describe, expect, it, vi } from 'vitest';
import type { PointerEvent } from 'react';
import { renderHook } from '@testing-library/react';
import { usePointerGesture } from '../hooks/usePointerGesture';

function pointer(clientX: number, clientY: number): PointerEvent<HTMLElement> {
  return { clientX, clientY } as PointerEvent<HTMLElement>;
}

describe('usePointerGesture', () => {
  it('reports a tap and a swipe from down/up pairs', () => {
    const onGesture = vi.fn();
    const { result } = renderHook(() => usePointerGesture(onGesture));
    result.current.onPointerDown(pointer(100, 100));
    result.current.onPointerUp(pointer(101, 100));
    result.current.onPointerDown(pointer(300, 100));
    result.current.onPointerUp(pointer(100, 105));
    expect(onGesture.mock.calls).toEqual([['tap'], ['next']]);
  });

  it('ignores an up without a down and a cancelled pointer', () => {
    const onGesture = vi.fn();
    const { result } = renderHook(() => usePointerGesture(onGesture));
    result.current.onPointerUp(pointer(0, 0));
    result.current.onPointerDown(pointer(0, 0));
    result.current.onPointerCancel();
    result.current.onPointerUp(pointer(0, 0));
    expect(onGesture).not.toHaveBeenCalled();
  });

  it('ignores ambiguous diagonal drags', () => {
    const onGesture = vi.fn();
    const { result } = renderHook(() => usePointerGesture(onGesture));
    result.current.onPointerDown(pointer(0, 0));
    result.current.onPointerUp(pointer(80, 80));
    expect(onGesture).not.toHaveBeenCalled();
  });
});
