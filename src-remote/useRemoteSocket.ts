import { useState, useEffect, useRef, useCallback } from 'react';
import type { RemoteState, RemoteCommand } from '@/lib/remote-protocol';

const BACKOFF = [1000, 2000, 4000, 8000, 8000];

export interface UseRemoteSocketResult {
  state: RemoteState | null;
  connected: boolean;
  send: (cmd: RemoteCommand) => void;
}

export function useRemoteSocket(host: string, token: string): UseRemoteSocketResult {
  const [state, setState] = useState<RemoteState | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(`ws://${host}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        setConnected(true);
        retryCountRef.current = 0;
      };

      ws.onmessage = (e) => {
        if (cancelled) return;
        try {
          setState(JSON.parse(e.data as string) as RemoteState);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        const idx = Math.min(retryCountRef.current, BACKOFF.length - 1);
        const delay = BACKOFF[idx] ?? 8000;
        retryCountRef.current += 1;
        timerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      wsRef.current?.close();
    };
  }, [host, token]);

  const send = useCallback((cmd: RemoteCommand) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  return { state, connected, send };
}
