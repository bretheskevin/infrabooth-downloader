import { describe, it, expect, vi } from 'vitest';
import { listen } from '@tauri-apps/api/event';
import { error as logError } from '@tauri-apps/plugin-log';

vi.mock('@/bindings', () => ({
  commands: { playerPlay: vi.fn().mockResolvedValue({ status: 'ok', data: null }) },
}));

import { audioEngine, PLAYER_EVENTS } from '../audio-engine';
import { flushPlayerCommands } from '../player-commands';

const LISTENER_COUNT = Object.keys(PLAYER_EVENTS).length;

describe('audioEngine listener registration', () => {
  it('releases registered listeners when one fails and retries on the next command', async () => {
    const unlisten = vi.fn();
    vi.mocked(listen).mockImplementation(async (name) => {
      if (name === PLAYER_EVENTS.error) throw new Error('denied');
      return unlisten;
    });

    audioEngine.play();
    await flushPlayerCommands();

    expect(unlisten).toHaveBeenCalledTimes(LISTENER_COUNT - 1);
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('Failed to register player event listeners'));

    vi.mocked(listen).mockReset();
    vi.mocked(listen).mockResolvedValue(unlisten);
    audioEngine.play();
    await flushPlayerCommands();

    expect(listen).toHaveBeenCalledTimes(LISTENER_COUNT);
  });
});
