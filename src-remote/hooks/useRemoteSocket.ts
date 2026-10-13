import { useState, useEffect, useRef, useCallback } from 'react';
import type { RemoteState, RemoteCommand, RemoteSocketControl } from '@/lib/remote-protocol';
import { emitSpectrum } from '@/lib/spectrumBus';
import { decodeSpectrumFrame } from '@remote/lib/spectrumFrame';

export const BACKOFF = [1000, 2000, 4000, 8000, 8000] as const;

export interface UseRemoteSocketResult {
  state: RemoteState | null;
  connected: boolean;
  send: (cmd: RemoteCommand) => void;
  setSpectrumEnabled: (enabled: boolean) => void;
}

function sendJson(ws: WebSocket | null, payload: RemoteCommand | RemoteSocketControl): void {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function routeMessage(data: unknown, onState: (state: RemoteState) => void): void {
  if (data instanceof ArrayBuffer) {
    emitSpectrum(decodeSpectrumFrame(data));
    return;
  }
  if (typeof data !== 'string') return;
  try {
    onState(JSON.parse(data) as RemoteState);
  } catch {
    // ignore malformed messages
  }
}

export function useRemoteSocket(host: string, token: string): UseRemoteSocketResult {
  const [state, setState] = useState<RemoteState | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spectrumEnabledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(`ws://${host}/ws?token=${token}`);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        setConnected(true);
        retryCountRef.current = 0;
        if (spectrumEnabledRef.current) sendJson(ws, { type: 'setSpectrum', enabled: true });
      };

      ws.onmessage = (e: MessageEvent) => {
        if (cancelled) return;
        routeMessage(e.data, setState);
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

  const send = useCallback((cmd: RemoteCommand) => sendJson(wsRef.current, cmd), []);

  const setSpectrumEnabled = useCallback((enabled: boolean) => {
    spectrumEnabledRef.current = enabled;
    sendJson(wsRef.current, { type: 'setSpectrum', enabled });
  }, []);

  return { state, connected, send, setSpectrumEnabled };
}
