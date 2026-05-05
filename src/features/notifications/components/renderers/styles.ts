import type { KeyboardEvent } from 'react';

export const NOTIFICATION_ROW_CLASS =
  'flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-accent/50 rounded-md transition-colors';

export const NOTIFICATION_ROW_WIDESCREEN_CLASS =
  'flex items-center gap-3 w-full px-4 py-3 text-left rounded-xl hover:bg-secondary/50 border border-transparent hover:border-border/60 transition-colors';

export function handleKeyActivate(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
}
