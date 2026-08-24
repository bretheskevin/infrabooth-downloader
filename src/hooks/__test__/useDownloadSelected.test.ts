import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDownloadSelected } from '../useDownloadSelected';
import type { TrackInfo } from '@/bindings';

const createTrack = (id: number) => ({ id, title: `Track ${id}` }) as TrackInfo;

describe('useDownloadSelected', () => {
  it('calls onDownloadTracks then clearSelection when tracks are non-empty', async () => {
    const onDownloadTracks = vi.fn().mockResolvedValue(undefined);
    const clearSelection = vi.fn();
    const tracks = [createTrack(1), createTrack(2)];

    const { result } = renderHook(() => useDownloadSelected(tracks, clearSelection, onDownloadTracks, 'My Playlist', '/dl'));

    await act(async () => {
      await result.current();
    });

    expect(onDownloadTracks).toHaveBeenCalledWith(tracks, 'My Playlist', '/dl');
    expect(clearSelection).toHaveBeenCalled();
  });

  it('calls clearSelection without calling onDownloadTracks when tracks array is empty', async () => {
    const onDownloadTracks = vi.fn();
    const clearSelection = vi.fn();

    const { result } = renderHook(() => useDownloadSelected([], clearSelection, onDownloadTracks, 'My Playlist', '/dl'));

    await act(async () => {
      await result.current();
    });

    expect(onDownloadTracks).not.toHaveBeenCalled();
    expect(clearSelection).toHaveBeenCalled();
  });
});
