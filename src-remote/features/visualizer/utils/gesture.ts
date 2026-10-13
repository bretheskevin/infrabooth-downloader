const SWIPE_MIN_PX = 50;
const TAP_MAX_PX = 12;
const HORIZONTAL_DOMINANCE = 1.5;

export type Gesture = 'next' | 'previous' | 'tap';

export function classifyGesture(dx: number, dy: number): Gesture | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX < TAP_MAX_PX && absY < TAP_MAX_PX) return 'tap';
  if (absX >= SWIPE_MIN_PX && absX > absY * HORIZONTAL_DOMINANCE) return dx < 0 ? 'next' : 'previous';
  return null;
}
