import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createMockTrackInfo } from '@/test/factories';

const { mockStartPlaylistDownload } = vi.hoisted(() => ({
  mockStartPlaylistDownload: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/queue/utils/startPlaylistDownload', () => ({ startPlaylistDownload: mockStartPlaylistDownload }));
vi.mock('@/features/queue/api/download', () => ({ cancelDownloadQueue: vi.fn().mockResolvedValue(undefined) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { useQueueStore } from '@/features/queue/store';
import { trackInfoToQueueTrack } from '../../utils/transforms';
import { useLibraryDownload } from '../useLibraryDownload';

const track = createMockTrackInfo({ id: 5, title: 'Song' });

describe('useLibraryDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueueStore.setState({ isProcessing: false, isCancelling: false, isComplete: false, failedCount: 0 });
  });

  it('starts the playlist download with queue tracks when the queue is idle', () => {
    const { result } = renderHook(() => useLibraryDownload());
    act(() => {
      void result.current.handleDownloadTracks([track], 'My Set', '/dir');
    });
    expect(mockStartPlaylistDownload).toHaveBeenCalledWith([trackInfoToQueueTrack(track)], 'My Set', '/dir');
    expect(result.current.pendingDownload).toBeNull();
  });

  it('holds the download as pending while a queue is processing', () => {
    useQueueStore.setState({ isProcessing: true });
    const { result } = renderHook(() => useLibraryDownload());
    act(() => {
      void result.current.handleDownloadTracks([track], 'My Set');
    });
    expect(mockStartPlaylistDownload).not.toHaveBeenCalled();
    expect(result.current.pendingDownload).toEqual({ tracks: [track], playlistTitle: 'My Set', outputDir: undefined });
  });
});
