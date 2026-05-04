import { clamp } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/date';

type SetFn<S> = (partial: Partial<S>) => void;

export function makeSetter<S, K extends keyof S>(key: K, set: SetFn<S>): (value: S[K]) => void {
  return (value) => set({ [key]: value } as unknown as Partial<S>);
}

export function makeClampedSetter<S, K extends keyof S>(key: K, set: SetFn<S>, min: number, max: number): (value: number) => void {
  return (value) => set({ [key]: clamp(value, min, max) } as unknown as Partial<S>);
}

export function pickKeys<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = source[k];
  return out;
}

export function formatBackupRelativeTime(timestamp: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const date = parseBackupTimestamp(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  return formatRelativeTime(date.toISOString(), t);
}

export function formatBackupAbsoluteDate(timestamp: string, locale: string): string {
  const date = parseBackupTimestamp(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function parseBackupTimestamp(timestamp: string): Date {
  const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})_(\d{3})/);
  if (!match) return new Date(NaN);
  const [, year, month, day, hour, min, sec, ms] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min), Number(sec), Number(ms)));
}
