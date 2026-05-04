import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayOverlay } from '../components/PlayOverlay';

describe('PlayOverlay', () => {
  it('renders children', () => {
    render(
      <PlayOverlay onPlay={vi.fn()}>
        <img alt="artwork" />
      </PlayOverlay>,
    );
    expect(screen.getByAltText('artwork')).toBeInTheDocument();
  });

  it('shows play icon on hover', async () => {
    const { container } = render(
      <PlayOverlay onPlay={vi.fn()}>
        <div>art</div>
      </PlayOverlay>,
    );
    fireEvent.mouseEnter(container.firstChild!);
    expect(screen.getByTestId('play-overlay-icon')).toBeInTheDocument();
  });

  it('calls onPlay when overlay is clicked', () => {
    const onPlay = vi.fn();
    const { container } = render(
      <PlayOverlay onPlay={onPlay}>
        <div>art</div>
      </PlayOverlay>,
    );
    fireEvent.mouseEnter(container.firstChild!);
    fireEvent.click(screen.getByTestId('play-overlay-icon'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });
});
