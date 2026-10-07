import { describe, it, expect, vi, beforeEach } from 'vitest';

const { isFocused, requestUserAttention } = vi.hoisted(() => ({
  isFocused: vi.fn(),
  requestUserAttention: vi.fn(),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ isFocused, requestUserAttention }),
  UserAttentionType: { Critical: 1, Informational: 2 },
}));

import { warn } from '@tauri-apps/plugin-log';
import { requestAttentionIfUnfocused } from '../requestAttentionIfUnfocused';

describe('requestAttentionIfUnfocused', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestUserAttention.mockResolvedValue(undefined);
  });

  it('requests a single informational attention when the window is not focused', async () => {
    isFocused.mockResolvedValue(false);
    await requestAttentionIfUnfocused();
    expect(requestUserAttention).toHaveBeenCalledTimes(1);
    expect(requestUserAttention).toHaveBeenCalledWith(2);
  });

  it('does nothing when the window is focused', async () => {
    isFocused.mockResolvedValue(true);
    await requestAttentionIfUnfocused();
    expect(requestUserAttention).not.toHaveBeenCalled();
  });

  it('logs and swallows a focus query failure', async () => {
    isFocused.mockRejectedValue(new Error('ipc down'));
    await expect(requestAttentionIfUnfocused()).resolves.toBeUndefined();
    expect(requestUserAttention).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ipc down'));
  });

  it('logs and swallows an attention request failure', async () => {
    isFocused.mockResolvedValue(false);
    requestUserAttention.mockRejectedValue(new Error('not allowed'));
    await expect(requestAttentionIfUnfocused()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not allowed'));
  });
});
