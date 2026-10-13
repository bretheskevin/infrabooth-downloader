const LERP = 0.2;
const SNAP = 0.005;

export function smoothTowards(displayed: readonly number[], target: readonly number[]): number[] {
  if (displayed.length !== target.length) return target.slice();
  return target.map((goal, i) => {
    const current = displayed[i] ?? 0;
    const next = current + (goal - current) * LERP;
    return Math.abs(goal - next) < SNAP ? goal : next;
  });
}

export function isSettled(displayed: readonly number[], target: readonly number[]): boolean {
  return displayed.length === target.length && displayed.every((value, i) => value === target[i]);
}

export function withTaperedTail(values: readonly number[], tailCount: number): number[] {
  if (values.length === 0) return [];
  const last = values[values.length - 1] ?? 0;
  const tail = Array.from({ length: tailCount }, (_, i) => last * (1 - (i + 1) / (tailCount + 1)));
  return [...values, ...tail];
}
