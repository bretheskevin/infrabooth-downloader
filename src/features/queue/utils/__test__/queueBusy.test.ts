import { describe, it, expect } from 'vitest';
import { isDownloadQueueBusy } from '../queueBusy';

const idle = { isProcessing: false, isCancelling: false, isComplete: false, failedCount: 0 };

describe('isDownloadQueueBusy', () => {
  it('is false for an idle queue', () => {
    expect(isDownloadQueueBusy(idle)).toBe(false);
  });

  it('is false for a cleanly completed queue', () => {
    expect(isDownloadQueueBusy({ ...idle, isComplete: true })).toBe(false);
  });

  it.each([
    { label: 'processing', state: { ...idle, isProcessing: true } },
    { label: 'cancelling', state: { ...idle, isCancelling: true } },
    { label: 'completed with failures', state: { ...idle, isComplete: true, failedCount: 2 } },
  ])('is true while $label', ({ state }) => {
    expect(isDownloadQueueBusy(state)).toBe(true);
  });
});
