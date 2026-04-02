import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrackSelection } from '../useTrackSelection';
import type { TrackInfo } from '@/bindings';

const createTrack = (id: number) =>
  ({ id, title: `Track ${id}` }) as TrackInfo;

const tracks = [createTrack(1), createTrack(2), createTrack(3)];

describe('useTrackSelection', () => {
  it('starts with no selection', () => {
    const { result } = renderHook(() => useTrackSelection(tracks));
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('toggles a track on and off', () => {
    const { result } = renderHook(() => useTrackSelection(tracks));

    act(() => result.current.toggleTrack(1));
    expect(result.current.selectedIds.has(1)).toBe(true);
    expect(result.current.selectedCount).toBe(1);

    act(() => result.current.toggleTrack(1));
    expect(result.current.selectedIds.has(1)).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it('toggleAll selects all tracks', () => {
    const { result } = renderHook(() => useTrackSelection(tracks));

    act(() => result.current.toggleAll());
    expect(result.current.isAllSelected).toBe(true);
    expect(result.current.selectedCount).toBe(3);
  });

  it('toggleAll deselects when all are selected', () => {
    const { result } = renderHook(() => useTrackSelection(tracks));

    act(() => result.current.toggleAll());
    act(() => result.current.toggleAll());
    expect(result.current.selectedCount).toBe(0);
  });

  it('clearSelection resets to empty', () => {
    const { result } = renderHook(() => useTrackSelection(tracks));

    act(() => result.current.toggleAll());
    act(() => result.current.clearSelection());
    expect(result.current.selectedCount).toBe(0);
  });

  it('excludes tracks in excludeIds from selection', () => {
    const excluded = new Set([2]);
    const { result } = renderHook(() => useTrackSelection(tracks, excluded));

    act(() => result.current.toggleTrack(2));
    expect(result.current.selectedIds.has(2)).toBe(false);
  });

  it('returns selectedTracks as TrackInfo array', () => {
    const { result } = renderHook(() => useTrackSelection(tracks));

    act(() => result.current.toggleTrack(1));
    act(() => result.current.toggleTrack(3));
    expect(result.current.selectedTracks).toEqual([tracks[0], tracks[2]]);
  });

  it('selectableCount excludes excluded ids', () => {
    const excluded = new Set([1, 2]);
    const { result } = renderHook(() => useTrackSelection(tracks, excluded));
    expect(result.current.selectableCount).toBe(1);
  });
});
