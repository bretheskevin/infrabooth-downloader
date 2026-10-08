import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Track } from '@/features/queue/types/track';

const { mockDispatch, mockLogger, queueState, settingsState } = vi.hoisted(() => ({
  mockDispatch: vi.fn().mockResolvedValue(undefined),
  mockLogger: {
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
  queueState: {
    isComplete: false,
    failedCount: 0,
    clearQueue: vi.fn(),
    enqueueTracks: vi.fn(),
    setOutputDir: vi.fn(),
    setInitializing: vi.fn(),
  },
  settingsState: { downloadPath: '/music', maxConcurrentDownloads: 3, preservePlaylistOrder: true },
}));

vi.mock('../dispatchDownloadQueue', () => ({ dispatchDownloadQueue: mockDispatch }));
vi.mock('@/features/queue/store', () => ({ useQueueStore: { getState: () => queueState } }));
vi.mock('@/features/settings/store', () => ({ useSettingsStore: { getState: () => settingsState } }));
vi.mock('@/lib/logger', () => ({ logger: mockLogger }));

import { startPlaylistDownload } from '../startPlaylistDownload';

const track: Track = { id: '1', title: 'Song', artist: 'Artist', artworkUrl: null, durationMs: 1000, status: 'pending' };

describe('startPlaylistDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueState.isComplete = false;
    queueState.failedCount = 0;
    settingsState.downloadPath = '/music';
  });

  it('dispatches the queue with the explicit folder and the download settings', async () => {
    await startPlaylistDownload([track], 'My Set', '/custom');
    expect(mockDispatch).toHaveBeenCalledWith({
      queueTracks: [track],
      albumName: 'My Set',
      outputDir: '/custom',
      maxConcurrent: 3,
      preserveOrder: true,
      enqueueTracks: queueState.enqueueTracks,
      setOutputDir: queueState.setOutputDir,
      setInitializing: queueState.setInitializing,
    });
  });

  it('falls back to the configured download path', async () => {
    await startPlaylistDownload([track], 'My Set');
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ outputDir: '/music' }));
  });

  it('passes null when no folder is configured', async () => {
    settingsState.downloadPath = '';
    await startPlaylistDownload([track], 'My Set');
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ outputDir: null }));
  });

  it('clears a cleanly completed queue before starting', async () => {
    queueState.isComplete = true;
    await startPlaylistDownload([track], 'My Set');
    expect(queueState.clearQueue).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('does nothing while a completed queue still has failures', async () => {
    queueState.isComplete = true;
    queueState.failedCount = 2;
    await startPlaylistDownload([track], 'My Set');
    expect(queueState.clearQueue).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('logs and swallows dispatch failures', async () => {
    mockDispatch.mockRejectedValueOnce(new Error('boom'));
    await expect(startPlaylistDownload([track], 'My Set')).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
