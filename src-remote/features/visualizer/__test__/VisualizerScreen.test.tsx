import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_VISUALIZER_SETTINGS, type RemoteState, type VisualizerSettings } from '@/lib/remote-protocol';
import VisualizerScreen from '../components/VisualizerScreen';

describe('VisualizerScreen', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => vi.restoreAllMocks());

  function renderScreen(visualizer: VisualizerSettings = DEFAULT_VISUALIZER_SETTINGS) {
    const onExit = vi.fn();
    const send = vi.fn();
    const setSpectrumEnabled = vi.fn();
    const state = { visualizer } as RemoteState;
    const utils = render(
      <VisualizerScreen state={state} language="en" send={send} setSpectrumEnabled={setSpectrumEnabled} onExit={onExit} />,
    );
    const root = utils.container.firstElementChild as HTMLElement;
    return { ...utils, root, onExit, send, setSpectrumEnabled };
  }

  function sentStyle(send: ReturnType<typeof vi.fn>) {
    return send.mock.lastCall?.[0]?.settings?.style;
  }

  it('subscribes to the spectrum while mounted', () => {
    const { unmount, setSpectrumEnabled } = renderScreen();
    expect(setSpectrumEnabled).toHaveBeenLastCalledWith(true);
    unmount();
    expect(setSpectrumEnabled).toHaveBeenLastCalledWith(false);
  });

  it('starts with a clean screen and reveals controls on tap', () => {
    const { root } = renderScreen();
    expect(screen.queryByRole('button', { name: 'Exit visualizer' })).toBeNull();
    fireEvent.pointerDown(root, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(root, { clientX: 102, clientY: 101 });
    expect(screen.getByRole('button', { name: 'Exit visualizer' })).toBeDefined();
  });

  it('sends the next style to the desktop on a swipe left', () => {
    const { root, send } = renderScreen();
    fireEvent.pointerDown(root, { clientX: 300, clientY: 200 });
    fireEvent.pointerUp(root, { clientX: 100, clientY: 210 });
    expect(send).toHaveBeenCalledWith({ type: 'setVisualizerSettings', settings: { ...DEFAULT_VISUALIZER_SETTINGS, style: 'mirrored' } });
  });

  it('cycles from the style pushed by the desktop on a swipe right', () => {
    const { root, send } = renderScreen({ ...DEFAULT_VISUALIZER_SETTINGS, style: 'radial' });
    fireEvent.pointerDown(root, { clientX: 100, clientY: 200 });
    fireEvent.pointerUp(root, { clientX: 300, clientY: 190 });
    expect(sentStyle(send)).toBe('mirrored');
  });

  it('picks a style from the controls and exits', () => {
    const { root, onExit, send } = renderScreen();
    fireEvent.pointerDown(root, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(root, { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole('button', { name: 'Wave' }));
    expect(sentStyle(send)).toBe('wave');
    fireEvent.click(screen.getByRole('button', { name: 'Exit visualizer' }));
    expect(onExit).toHaveBeenCalled();
  });
});
