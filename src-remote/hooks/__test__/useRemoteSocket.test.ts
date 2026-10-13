import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { subscribeSpectrum } from '@/lib/spectrumBus';
import { BACKOFF, useRemoteSocket } from '@remote/hooks/useRemoteSocket';

class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];
  readyState = 0;
  binaryType = 'blob';
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

function latestSocket(): MockWebSocket {
  const socket = MockWebSocket.instances[MockWebSocket.instances.length - 1];
  if (!socket) throw new Error('no socket created');
  return socket;
}

const ENABLE = JSON.stringify({ type: 'setSpectrum', enabled: true });

describe('useRemoteSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('asks for ArrayBuffer binary frames', () => {
    renderHook(() => useRemoteSocket('host:1', 'tok'));
    expect(latestSocket().binaryType).toBe('arraybuffer');
  });

  it('routes binary frames to the spectrum bus without touching state', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSpectrum(listener);
    const { result } = renderHook(() => useRemoteSocket('host:1', 'tok'));
    act(() => {
      latestSocket().open();
      latestSocket().onmessage?.({ data: new Uint8Array([0, 255]).buffer });
    });
    unsubscribe();
    expect(listener).toHaveBeenCalledWith([0, 1]);
    expect(result.current.state).toBeNull();
  });

  it('parses text frames as RemoteState', () => {
    const { result } = renderHook(() => useRemoteSocket('host:1', 'tok'));
    act(() => {
      latestSocket().open();
      latestSocket().onmessage?.({ data: JSON.stringify({ state: 'playing' }) });
    });
    expect(result.current.state?.state).toBe('playing');
  });

  it('sends setSpectrum when toggled while connected', () => {
    const { result } = renderHook(() => useRemoteSocket('host:1', 'tok'));
    act(() => latestSocket().open());
    act(() => result.current.setSpectrumEnabled(true));
    expect(latestSocket().sent).toEqual([ENABLE]);
  });

  it('re-sends setSpectrum after a reconnect', () => {
    const { result } = renderHook(() => useRemoteSocket('host:1', 'tok'));
    const first = latestSocket();
    act(() => first.open());
    act(() => result.current.setSpectrumEnabled(true));
    act(() => first.close());
    act(() => {
      vi.advanceTimersByTime(BACKOFF[0]);
    });
    const second = latestSocket();
    expect(second).not.toBe(first);
    act(() => second.open());
    expect(second.sent).toEqual([ENABLE]);
  });

  it('does not re-send after the visualizer disabled the spectrum', () => {
    const { result } = renderHook(() => useRemoteSocket('host:1', 'tok'));
    const first = latestSocket();
    act(() => first.open());
    act(() => result.current.setSpectrumEnabled(true));
    act(() => result.current.setSpectrumEnabled(false));
    act(() => first.close());
    act(() => {
      vi.advanceTimersByTime(BACKOFF[0]);
    });
    act(() => latestSocket().open());
    expect(latestSocket().sent).toEqual([]);
  });
});
