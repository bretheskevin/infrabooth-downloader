import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../api/searchTracks', () => ({
  searchTracks: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/useDebounce', () => ({
  useDebounce: <T>(value: T, _delay: number): T => value,
}));

import { useTrackSearch } from '../useTrackSearch';
import { searchTracks } from '../../api/searchTracks';

const mockSearchTracks = vi.mocked(searchTracks);

describe('useTrackSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers fetch immediately when useDebounce returns value without delay', async () => {
    const { result } = renderHook(() => useTrackSearch('localhost:3000', 'token123'));

    await act(async () => {
      result.current.setQuery('hello');
    });

    expect(mockSearchTracks).toHaveBeenCalledWith('localhost:3000', 'token123', 'hello');
  });

  it('does not fetch when query is empty', async () => {
    const { result } = renderHook(() => useTrackSearch('localhost:3000', 'token123'));

    await act(async () => {
      result.current.setQuery('  ');
    });

    expect(mockSearchTracks).not.toHaveBeenCalled();
  });

  it('clears results when query becomes empty', async () => {
    mockSearchTracks.mockResolvedValueOnce([
      { trackId: 1, title: 'Track', artist: 'Artist', artistId: 0, trackUrl: '', artworkUrl: null, durationMs: 0, waveformUrl: null },
    ]);
    const { result } = renderHook(() => useTrackSearch('localhost:3000', 'token123'));

    await act(async () => {
      result.current.setQuery('hello');
    });

    await act(async () => {
      result.current.setQuery('');
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('exposes query and setQuery in returned shape', () => {
    const { result } = renderHook(() => useTrackSearch('localhost:3000', 'token123'));

    expect(result.current.query).toBe('');
    expect(typeof result.current.setQuery).toBe('function');
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
