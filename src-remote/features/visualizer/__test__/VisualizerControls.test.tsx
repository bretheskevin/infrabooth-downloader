import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import VisualizerControls from '../components/VisualizerControls';
import { DEFAULT_VISUALIZER_SETTINGS } from '@/lib/remote-protocol';
import { changeFullscreenElement, mockSupportedFullscreen, resetFullscreen, resetStandalone, setStandalone } from './mockFullscreen';

function renderControls(onInteract = vi.fn(), onChange = vi.fn()) {
  render(
    <VisualizerControls
      settings={DEFAULT_VISUALIZER_SETTINGS}
      language="en"
      onChange={onChange}
      onExit={vi.fn()}
      onInteract={onInteract}
    />,
  );
  return { onInteract, onChange };
}

describe('VisualizerControls toggles', () => {
  it('sends a copy with only the flipped toggle changed', () => {
    const { onChange } = renderControls();
    fireEvent.click(screen.getByRole('switch', { name: 'Color from artwork' }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_VISUALIZER_SETTINGS, artworkColor: true });
  });
});

describe('VisualizerControls fullscreen toggle', () => {
  afterEach(resetFullscreen);

  it('enters fullscreen from the click when windowed', () => {
    const { request, exit } = mockSupportedFullscreen();
    renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    expect(request).toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it('swaps to an exit button while fullscreen', () => {
    const { request, exit } = mockSupportedFullscreen();
    renderControls();
    changeFullscreenElement(document.documentElement);
    expect(screen.queryByRole('button', { name: 'Enter fullscreen' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Exit fullscreen' }));
    expect(exit).toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('counts as interaction for the auto-hide timer', () => {
    mockSupportedFullscreen();
    const { onInteract } = renderControls();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Enter fullscreen' }));
    expect(onInteract).toHaveBeenCalled();
  });
});

describe('VisualizerControls iPhone hint', () => {
  afterEach(() => {
    resetFullscreen();
    resetStandalone();
  });

  it('shows the fullscreen button without a hint when the Fullscreen API is unsupported', () => {
    renderControls();
    expect(screen.getByRole('button', { name: 'Enter fullscreen' })).not.toBeNull();
    expect(screen.queryByText(/Add to Home Screen/)).toBeNull();
  });

  it('reveals the Add to Home Screen hint on tap and does not request fullscreen', () => {
    renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    expect(screen.getByText(/Add to Home Screen/)).not.toBeNull();
  });

  it('hides the hint on a second tap', () => {
    renderControls();
    const button = screen.getByRole('button', { name: 'Enter fullscreen' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.queryByText(/Add to Home Screen/)).toBeNull();
  });

  it('counts the unsupported tap as interaction', () => {
    const { onInteract } = renderControls();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Enter fullscreen' }));
    expect(onInteract).toHaveBeenCalled();
  });

  it('hides the button when already running as a standalone web app', () => {
    setStandalone(true);
    renderControls();
    expect(screen.queryByRole('button', { name: 'Enter fullscreen' })).toBeNull();
  });

  it('keeps the normal toggle and no hint when the Fullscreen API is supported', () => {
    const { request } = mockSupportedFullscreen();
    renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    expect(request).toHaveBeenCalled();
    expect(screen.queryByText(/Add to Home Screen/)).toBeNull();
  });
});
