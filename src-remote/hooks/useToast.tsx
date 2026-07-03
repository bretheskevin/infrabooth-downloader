import { useState, useRef } from 'react';

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(msg);
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, 2000);
  }

  const toastElement = toast ? (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm whitespace-nowrap bg-card text-foreground border border-border">
      {toast}
    </div>
  ) : null;

  return { showToast, toastElement };
}
