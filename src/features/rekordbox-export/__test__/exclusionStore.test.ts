import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRekordboxExclusionStore, useExcludedTrackIds } from '../store';

describe('useRekordboxExclusionStore', () => {
  beforeEach(() => {
    useRekordboxExclusionStore.setState({ excludedByPlaylist: {} });
  });

  it('toggleExcluded adds a track to the playlist exclusion list', () => {
    act(() => useRekordboxExclusionStore.getState().toggleExcluded('pl-1', 100));
    expect(useRekordboxExclusionStore.getState().excludedByPlaylist['pl-1']).toEqual([100]);
  });

  it('toggleExcluded removes an already-excluded track', () => {
    act(() => useRekordboxExclusionStore.getState().toggleExcluded('pl-1', 100));
    act(() => useRekordboxExclusionStore.getState().toggleExcluded('pl-1', 100));
    expect(useRekordboxExclusionStore.getState().excludedByPlaylist['pl-1']).toEqual([]);
  });

  it('per-playlist isolation: excluding in A does not affect B', () => {
    act(() => useRekordboxExclusionStore.getState().toggleExcluded('pl-a', 1));
    act(() => useRekordboxExclusionStore.getState().toggleExcluded('pl-b', 2));
    expect(useRekordboxExclusionStore.getState().excludedByPlaylist['pl-a']).toEqual([1]);
    expect(useRekordboxExclusionStore.getState().excludedByPlaylist['pl-b']).toEqual([2]);
  });

  it('excludeTracks bulk-adds multiple track ids', () => {
    act(() => useRekordboxExclusionStore.getState().excludeTracks('pl-1', [10, 20, 30]));
    expect(useRekordboxExclusionStore.getState().excludedByPlaylist['pl-1']).toEqual([10, 20, 30]);
  });

  it('excludeTracks does not duplicate already-excluded ids', () => {
    act(() => useRekordboxExclusionStore.getState().toggleExcluded('pl-1', 10));
    act(() => useRekordboxExclusionStore.getState().excludeTracks('pl-1', [10, 20]));
    expect(useRekordboxExclusionStore.getState().excludedByPlaylist['pl-1']).toEqual([10, 20]);
  });

  it('persisted shape is Record<string, number[]>', () => {
    act(() => useRekordboxExclusionStore.getState().toggleExcluded('pl-1', 5));
    const state = useRekordboxExclusionStore.getState().excludedByPlaylist;
    expect(typeof state).toBe('object');
    expect(Array.isArray(state['pl-1'])).toBe(true);
  });
});

describe('useExcludedTrackIds', () => {
  beforeEach(() => {
    useRekordboxExclusionStore.setState({ excludedByPlaylist: {} });
  });

  it('returns empty Set when playlistId is undefined', () => {
    const { result } = renderHook(() => useExcludedTrackIds(undefined));
    expect(result.current).toBeInstanceOf(Set);
    expect(result.current.size).toBe(0);
  });

  it('returns empty Set when playlist has no exclusions', () => {
    const { result } = renderHook(() => useExcludedTrackIds('pl-1'));
    expect(result.current.size).toBe(0);
  });

  it('returns a Set containing excluded track ids', () => {
    act(() => useRekordboxExclusionStore.getState().excludeTracks('pl-1', [10, 20]));
    const { result } = renderHook(() => useExcludedTrackIds('pl-1'));
    expect(result.current).toEqual(new Set([10, 20]));
  });

  it('memoizes the Set reference when the underlying array has not changed', () => {
    act(() => useRekordboxExclusionStore.getState().excludeTracks('pl-1', [10]));
    const { result, rerender } = renderHook(() => useExcludedTrackIds('pl-1'));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
