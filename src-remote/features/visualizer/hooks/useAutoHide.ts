import { useEffect, useRef, useState } from 'react';

export const AUTO_HIDE_MS = 3000;

type TimerRef = { current: ReturnType<typeof setTimeout> | null };

function clearTimer(timerRef: TimerRef): void {
  if (timerRef.current === null) return;
  clearTimeout(timerRef.current);
  timerRef.current = null;
}

export function useAutoHide() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimer(timerRef), []);

  function reveal() {
    clearTimer(timerRef);
    setVisible(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setVisible(false);
    }, AUTO_HIDE_MS);
  }

  function toggle() {
    if (!visible) {
      reveal();
      return;
    }
    clearTimer(timerRef);
    setVisible(false);
  }

  return { visible, reveal, toggle };
}
