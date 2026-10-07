import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/queue/utils/requestAttentionIfUnfocused', () => ({
  requestAttentionIfUnfocused: vi.fn().mockResolvedValue(undefined),
}));

import { listen } from '@tauri-apps/api/event';
import { requestAttentionIfUnfocused } from '@/features/queue/utils/requestAttentionIfUnfocused';
import '../store';

type Handler = (event: { payload: unknown }) => void;

function emitQueueEvent(name: string, payload: unknown): void {
  const call = vi.mocked(listen).mock.calls.find(([event]) => event === name);
  if (!call) throw new Error(`No listener registered for ${name}`);
  (call[1] as unknown as Handler)({ payload });
}

describe('queue completion attention', () => {
  beforeEach(() => {
    vi.mocked(requestAttentionIfUnfocused).mockClear();
  });

  it('requests attention once when the queue completes', () => {
    emitQueueEvent('queue-complete', { completed: 2, failed: 0, total: 2, failedTracks: [] });
    expect(requestAttentionIfUnfocused).toHaveBeenCalledTimes(1);
  });

  it('requests attention even when some tracks failed', () => {
    emitQueueEvent('queue-complete', { completed: 1, failed: 1, total: 2, failedTracks: [['t2', 'boom']] });
    expect(requestAttentionIfUnfocused).toHaveBeenCalledTimes(1);
  });

  it('does not request attention when the queue is cancelled', () => {
    emitQueueEvent('queue-cancelled', { completed: 1, cancelled: 1, total: 2 });
    expect(requestAttentionIfUnfocused).not.toHaveBeenCalled();
  });

  it('does not request attention on per-track progress', () => {
    emitQueueEvent('queue-progress', { current: 1, total: 2, trackId: 't1' });
    expect(requestAttentionIfUnfocused).not.toHaveBeenCalled();
  });
});
