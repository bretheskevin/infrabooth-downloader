import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { classifyGesture, type Gesture } from '../utils/gesture';

export function usePointerGesture(onGesture: (gesture: Gesture) => void) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  function onPointerDown(e: PointerEvent<HTMLElement>) {
    startRef.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e: PointerEvent<HTMLElement>) {
    const start = startRef.current;
    startRef.current = null;
    if (!start) return;
    const gesture = classifyGesture(e.clientX - start.x, e.clientY - start.y);
    if (gesture) onGesture(gesture);
  }

  function onPointerCancel() {
    startRef.current = null;
  }

  return { onPointerDown, onPointerUp, onPointerCancel };
}
