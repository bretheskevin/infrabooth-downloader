import { useEffect, useState } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export function useTauriEventDialog<TPayload, TState>(
  eventName: string,
  memoizedMapPayload: (payload: TPayload) => TState,
  initialState: TState,
) {
  const [state, setState] = useState<TState>(initialState);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let mounted = true;

    const setupListener = async () => {
      unlisten = await listen<TPayload>(eventName, (event) => {
        if (mounted && event.payload) {
          setState(memoizedMapPayload(event.payload));
        }
      });
    };

    setupListener();

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, [eventName, memoizedMapPayload]);

  const close = (resetState: TState) => setState(resetState);

  return { state, close };
}
