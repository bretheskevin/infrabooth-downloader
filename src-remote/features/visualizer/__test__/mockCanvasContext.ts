import { vi } from 'vitest';

export function createMockContext() {
  const gradient = { addColorStop: vi.fn() };
  const mock = {
    clearRect: vi.fn(),
    fillRect: vi.fn((_x: number, _y: number, _w: number, _h: number) => undefined),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn((_x: number, _y: number) => undefined),
    lineTo: vi.fn((_x: number, _y: number) => undefined),
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    fillStyle: '' as string | CanvasGradient,
    strokeStyle: '' as string | CanvasGradient,
    lineWidth: 1,
    lineCap: 'butt' as 'butt' | 'round' | 'square',
    shadowBlur: 0,
    shadowColor: '',
  };
  return { mock, ctx: mock as unknown as CanvasRenderingContext2D };
}
