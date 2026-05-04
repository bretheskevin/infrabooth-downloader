import { beforeEach, describe, expect, it, vi } from 'vitest';

const { commands, getState } = vi.hoisted(() => ({
  commands: {
    detectRekordbox: vi.fn(),
    exportToRekordbox: vi.fn(),
    listRekordboxPlaylists: vi.fn(),
    deleteRekordboxPlaylist: vi.fn(),
    restoreRekordboxBackup: vi.fn(),
  },
  getState: vi.fn(),
}));

vi.mock('@/bindings', () => ({
  commands,
}));

vi.mock('@/features/settings/store', () => ({
  useSettingsStore: {
    getState,
  },
}));

import { api } from '../tauri';

describe('api rekordbox commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getState.mockReturnValue({
      rekordboxPathOverride: '/Users/test/rekordbox/master.db',
    });
  });

  it('passes manualDbPath to detectRekordbox when provided', async () => {
    commands.detectRekordbox.mockResolvedValue({
      status: 'ok',
      data: { found: true, version: '6', dbPath: '/manual/master.db', isRunning: false },
    });

    await api.detectRekordbox('/manual/master.db');

    expect(commands.detectRekordbox).toHaveBeenCalledWith('/manual/master.db');
  });

  it('passes null to detectRekordbox when no path provided', async () => {
    commands.detectRekordbox.mockResolvedValue({
      status: 'ok',
      data: { found: true, version: '6', dbPath: '/auto/master.db', isRunning: false },
    });

    await api.detectRekordbox();

    expect(commands.detectRekordbox).toHaveBeenCalledWith(null);
  });

  it('passes the saved override to exportToRekordbox', async () => {
    commands.exportToRekordbox.mockResolvedValue({
      status: 'ok',
      data: {
        exportedCount: 1,
        skippedCount: 0,
        playlistName: 'All Tracks',
        errors: [],
      },
    });

    await api.exportToRekordbox([{ sourcePath: '/tmp/track.mp3' }], 'All Tracks');

    expect(commands.exportToRekordbox).toHaveBeenCalledWith(
      [{ sourcePath: '/tmp/track.mp3' }],
      'All Tracks',
      null,
      '/Users/test/rekordbox/master.db',
    );
  });

  it('passes the saved override to listRekordboxPlaylists', async () => {
    commands.listRekordboxPlaylists.mockResolvedValue({
      status: 'ok',
      data: [],
    });

    await api.listRekordboxPlaylists();

    expect(commands.listRekordboxPlaylists).toHaveBeenCalledWith('/Users/test/rekordbox/master.db');
  });

  it('passes the saved override to deleteRekordboxPlaylist', async () => {
    commands.deleteRekordboxPlaylist.mockResolvedValue({
      status: 'ok',
      data: null,
    });

    await api.deleteRekordboxPlaylist('playlist-1');

    expect(commands.deleteRekordboxPlaylist).toHaveBeenCalledWith('playlist-1', '/Users/test/rekordbox/master.db');
  });

  it('passes the saved override to restoreRekordboxBackup', async () => {
    commands.restoreRekordboxBackup.mockResolvedValue({
      status: 'ok',
      data: null,
    });

    await api.restoreRekordboxBackup('/tmp/backup');

    expect(commands.restoreRekordboxBackup).toHaveBeenCalledWith('/tmp/backup', '/Users/test/rekordbox/master.db');
  });

  it('passes null when no saved override exists', async () => {
    getState.mockReturnValue({
      rekordboxPathOverride: '',
    });
    commands.listRekordboxPlaylists.mockResolvedValue({
      status: 'ok',
      data: [],
    });

    await api.listRekordboxPlaylists();

    expect(commands.listRekordboxPlaylists).toHaveBeenCalledWith(null);
  });
});
