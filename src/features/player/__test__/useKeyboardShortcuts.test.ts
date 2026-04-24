import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../audio-engine', () => ({
  audioEngine: {
    setCallbacks: vi.fn(),
    load: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    setVolume: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
    getState: vi.fn().mockReturnValue('idle'),
    getPosition: vi.fn().mockReturnValue({ positionMs: 0, durationMs: 0 }),
    preloadNext: vi.fn(),
    startCrossfade: vi.fn(),
    cancelCrossfade: vi.fn(),
    settleCrossfade: vi.fn(),
    isCrossfading: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../url-cache', () => ({
  getCachedUrl: vi.fn().mockReturnValue(null),
  setCachedUrl: vi.fn(),
  invalidateCachedUrl: vi.fn(),
  resolveWithCache: vi.fn().mockResolvedValue('https://example.com/stream.m3u8'),
  preloadQueueSegments: vi.fn(),
  purgeStaleCache: vi.fn(),
}));

import { usePlayerStore } from '../store';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { audioEngine } from '../audio-engine';

function pressSpace() {
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true }));
}

function pressSpaceOnElement(el: HTMLElement) {
  el.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true }));
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      state: 'stopped',
      currentTrack: null,
      queue: [],
      cursor: 0,
      positionMs: 0,
      durationMs: 0,
      volume: 1.0,
      isExpanded: false,
      isQueueOpen: false,
      isShuffled: false,
      originalQueue: null,
      manualQueueCount: 0,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should pause when playing and Space is pressed', () => {
    usePlayerStore.setState({ state: 'playing' });
    const { unmount } = renderHook(() => useKeyboardShortcuts());

    pressSpace();

    expect(audioEngine.pause).toHaveBeenCalled();
    unmount();
  });

  it('should resume when paused and Space is pressed', () => {
    usePlayerStore.setState({ state: 'paused' });
    const { unmount } = renderHook(() => useKeyboardShortcuts());

    pressSpace();

    expect(audioEngine.play).toHaveBeenCalled();
    unmount();
  });

  it('should not trigger when state is stopped', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts());

    pressSpace();

    expect(audioEngine.pause).not.toHaveBeenCalled();
    expect(audioEngine.play).not.toHaveBeenCalled();
    unmount();
  });

  it('should not trigger when focused on an input element', () => {
    usePlayerStore.setState({ state: 'playing' });
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const { unmount } = renderHook(() => useKeyboardShortcuts());

    pressSpaceOnElement(input);

    expect(audioEngine.pause).not.toHaveBeenCalled();
    unmount();
  });

  it('should not trigger when focused on a textarea', () => {
    usePlayerStore.setState({ state: 'playing' });
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const { unmount } = renderHook(() => useKeyboardShortcuts());

    pressSpaceOnElement(textarea);

    expect(audioEngine.pause).not.toHaveBeenCalled();
    unmount();
  });

  it('should not trigger when focused on a button', () => {
    usePlayerStore.setState({ state: 'playing' });
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const { unmount } = renderHook(() => useKeyboardShortcuts());

    pressSpaceOnElement(button);

    expect(audioEngine.pause).not.toHaveBeenCalled();
    unmount();
  });

  it('should not trigger when focused on a contenteditable element', () => {
    usePlayerStore.setState({ state: 'playing' });
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.tabIndex = 0;
    document.body.appendChild(div);
    div.focus();

    const { unmount } = renderHook(() => useKeyboardShortcuts());

    pressSpaceOnElement(div);

    expect(audioEngine.pause).not.toHaveBeenCalled();
    unmount();
  });

  it('should not trigger when focused on a select element', () => {
    usePlayerStore.setState({ state: 'playing' });
    const select = document.createElement('select');
    document.body.appendChild(select);
    select.focus();

    const { unmount } = renderHook(() => useKeyboardShortcuts());

    pressSpaceOnElement(select);

    expect(audioEngine.pause).not.toHaveBeenCalled();
    unmount();
  });

  it('should not trigger when focused on an element with role="button"', () => {
    usePlayerStore.setState({ state: 'playing' });
    const div = document.createElement('div');
    div.setAttribute('role', 'button');
    div.tabIndex = 0;
    document.body.appendChild(div);
    div.focus();

    const { unmount } = renderHook(() => useKeyboardShortcuts());

    pressSpaceOnElement(div);

    expect(audioEngine.pause).not.toHaveBeenCalled();
    unmount();
  });

  it('should not trigger for non-Space keys', () => {
    usePlayerStore.setState({ state: 'playing' });
    const { unmount } = renderHook(() => useKeyboardShortcuts());

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', bubbles: true }));

    expect(audioEngine.pause).not.toHaveBeenCalled();
    unmount();
  });

  it('should clean up listener on unmount', () => {
    usePlayerStore.setState({ state: 'playing' });
    const { unmount } = renderHook(() => useKeyboardShortcuts());

    unmount();
    pressSpace();

    expect(audioEngine.pause).not.toHaveBeenCalled();
  });
});
