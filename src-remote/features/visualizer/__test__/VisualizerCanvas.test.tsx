import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import VisualizerCanvas from '../components/VisualizerCanvas';
import { createMockContext } from './mockCanvasContext';

describe('VisualizerCanvas', () => {
  beforeEach(() => {
    const { ctx } = createMockContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 7),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders a full-size, hidden-from-AT canvas', () => {
    const { container } = render(<VisualizerCanvas style="bars" colorHsl={null} playing={false} />);
    const canvas = container.querySelector('canvas');
    expect(canvas?.classList.contains('h-full') && canvas.classList.contains('w-full')).toBe(true);
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
  });

  it('starts the animation loop on mount and cancels it on unmount', () => {
    const { unmount } = render(<VisualizerCanvas style="bars" colorHsl={null} playing={false} />);
    expect(requestAnimationFrame).toHaveBeenCalled();
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
  });
});
