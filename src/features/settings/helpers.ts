import { clamp } from '@/lib/utils';

type SetFn<S> = (partial: Partial<S>) => void;

export function makeSetter<S, K extends keyof S>(
  key: K,
  set: SetFn<S>,
): (value: S[K]) => void {
  return (value) => set({ [key]: value } as unknown as Partial<S>);
}

export function makeClampedSetter<S, K extends keyof S>(
  key: K,
  set: SetFn<S>,
  min: number,
  max: number,
): (value: number) => void {
  return (value) => set({ [key]: clamp(value, min, max) } as unknown as Partial<S>);
}

export function pickKeys<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = source[k];
  return out;
}
