import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDownloadedTracks } from '../useDownloadedTracks';
import type { TrackInfo } from '@/bindings';

const mockScanExistingTracks = vi.fn();
vi.mock('@/bindings', () => ({
  commands: {
    scanExistingTracks: (...args: unknown[]) => mockScanExistingTracks(...args),
  },
}));

function makeTrack(id: number): TrackInfo {
  return {
    id,
    title: `Track ${id}`,
    duration: 180000,
    user: { id: 0, username: 'Artist', avatar_url: null },
    artwork_url: null,
    permalink_url: `https://soundcloud.com/artist/track-${id}`,
  } as TrackInfo;
}

describe('useDownloadedTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScanExistingTracks.mockResolvedValue([]);
  });

  it('returns empty set when no download path', () => {
    const tracks = [makeTrack(1), makeTrack(2)];
    const { result } = renderHook(() => useDownloadedTracks(tracks, undefined));

    expect(result.current.downloadedIds.size).toBe(0);
    expect(result.current.downloadedCount).toBe(0);
    expect(mockScanExistingTracks).not.toHaveBeenCalled();
  });

  it('returns empty set when no tracks', () => {
    const { result } = renderHook(() => useDownloadedTracks(undefined, '/downloads'));

    expect(result.current.downloadedIds.size).toBe(0);
    expect(mockScanExistingTracks).not.toHaveBeenCalled();
  });

  it('scans and returns downloaded track IDs', async () => {
    mockScanExistingTracks.mockResolvedValue(['1', '3']);
    const tracks = [makeTrack(1), makeTrack(2), makeTrack(3)];

    const { result } = renderHook(() => useDownloadedTracks(tracks, '/downloads'));

    await waitFor(() => {
      expect(result.current.downloadedCount).toBe(2);
    });

    expect(result.current.downloadedIds.has(1)).toBe(true);
    expect(result.current.downloadedIds.has(2)).toBe(false);
    expect(result.current.downloadedIds.has(3)).toBe(true);
    expect(mockScanExistingTracks).toHaveBeenCalledWith('/downloads', ['1', '2', '3']);
  });

  it('returns empty set on scan error', async () => {
    mockScanExistingTracks.mockRejectedValue(new Error('scan failed'));
    const tracks = [makeTrack(1)];

    const { result } = renderHook(() => useDownloadedTracks(tracks, '/downloads'));

    await waitFor(() => {
      expect(mockScanExistingTracks).toHaveBeenCalled();
    });

    expect(result.current.downloadedIds.size).toBe(0);
    expect(result.current.downloadedCount).toBe(0);
  });

  it('re-scans when download path changes', async () => {
    mockScanExistingTracks.mockResolvedValue(['1']);
    const tracks = [makeTrack(1), makeTrack(2)];

    const { result, rerender } = renderHook(
      ({ path }) => useDownloadedTracks(tracks, path),
      { initialProps: { path: '/path-a' } },
    );

    await waitFor(() => {
      expect(result.current.downloadedCount).toBe(1);
    });

    mockScanExistingTracks.mockResolvedValue(['1', '2']);
    rerender({ path: '/path-b' });

    await waitFor(() => {
      expect(result.current.downloadedCount).toBe(2);
    });

    expect(mockScanExistingTracks).toHaveBeenCalledTimes(2);
  });
});
