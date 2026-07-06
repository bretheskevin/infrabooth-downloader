import { describe, it, expect, vi } from 'vitest';
import { drawWaveform } from '@/lib/waveform';

function makeTrackingCtx() {
  const fills: string[] = [];
  const ctx = {
    clearRect: vi.fn(),
    fillStyle: '' as string,
    fillRect: vi.fn(() => {
      fills.push(ctx.fillStyle);
    }),
    get capturedFills(): readonly string[] {
      return fills;
    },
  };
  return ctx as unknown as CanvasRenderingContext2D & { capturedFills: readonly string[] };
}

describe('drawWaveform', () => {
  it('clears the canvas with given dimensions', () => {
    const ctx = makeTrackingCtx();
    drawWaveform(ctx, [], { progress: 0, width: 90, height: 48, playedColor: 'p', barColor: 'b' });
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 90, 48);
  });

  it('draws floor(width/3) bars', () => {
    const ctx = makeTrackingCtx();
    drawWaveform(ctx, new Array(100).fill(0.5) as number[], {
      progress: 0,
      width: 90,
      height: 48,
      playedColor: 'p',
      barColor: 'b',
    });
    expect(ctx.fillRect).toHaveBeenCalledTimes(30);
  });

  it('uses playedColor for bars at or before playedIndex', () => {
    const ctx = makeTrackingCtx();
    // width=30 → 10 bars; progress=0.5 → playedIndex=5 (bars 0-5 played)
    drawWaveform(ctx, new Array(30).fill(1) as number[], {
      progress: 0.5,
      width: 30,
      height: 48,
      playedColor: 'played',
      barColor: 'unplayed',
    });
    expect(ctx.capturedFills.slice(0, 6)).toEqual(Array(6).fill('played'));
    expect(ctx.capturedFills.slice(6)).toEqual(Array(4).fill('unplayed'));
  });

  it('uses hoverBarColor for bars in hover range when hoverProgress is set', () => {
    const ctx = makeTrackingCtx();
    // width=30 → 10 bars; progress=0 → playedIndex=0; hoverProgress=0.5 → hoverIndex=5
    drawWaveform(ctx, new Array(30).fill(1) as number[], {
      progress: 0,
      width: 30,
      height: 48,
      playedColor: 'played',
      barColor: 'unplayed',
      hoverProgress: 0.5,
      hoverBarColor: 'hover',
    });
    expect(ctx.capturedFills[0]).toBe('played');
    expect(ctx.capturedFills.slice(1, 6)).toEqual(Array(5).fill('hover'));
    expect(ctx.capturedFills.slice(6)).toEqual(Array(4).fill('unplayed'));
  });
});
