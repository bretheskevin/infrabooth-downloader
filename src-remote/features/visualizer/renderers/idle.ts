const IDLE_LEVEL = 0.12;
const IDLE_SWING = 0.08;
const IDLE_PERIOD_MS = 4000;
const IDLE_PHASE_STEP = 0.45;
const IDLE_TILT = 0.5;
const IDLE_BLEND_LERP = 0.04;
const IDLE_BLEND_SNAP = 0.001;

export function idleBands(count: number, timeMs: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    const phase = (timeMs / IDLE_PERIOD_MS) * Math.PI * 2 + i * IDLE_PHASE_STEP;
    const tilt = 1 - (i / count) * IDLE_TILT;
    return (IDLE_LEVEL + IDLE_SWING * (0.5 + 0.5 * Math.sin(phase))) * tilt;
  });
}

export function mixBands(live: readonly number[], idle: readonly number[], idleMix: number): number[] {
  return idle.map((value, i) => (live[i] ?? 0) * (1 - idleMix) + value * idleMix);
}

export function stepIdleMix(current: number, idle: boolean): number {
  const target = idle ? 1 : 0;
  const next = current + (target - current) * IDLE_BLEND_LERP;
  return Math.abs(target - next) < IDLE_BLEND_SNAP ? target : next;
}
