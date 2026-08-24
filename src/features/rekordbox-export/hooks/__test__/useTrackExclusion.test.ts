import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/components/track-list-context', () => ({
  useTrackListContextOptional: vi.fn(() => null),
}));

import { useTrackExclusion } from '../useTrackExclusion';
import { useRekordboxExclusionStore } from '../../store';
import { useTrackListContextOptional } from '@/components/track-list-context';

describe('useTrackExclusion', () => {
  beforeEach(() => {
    useRekordboxExclusionStore.setState({ excludedByPlaylist: {} });
    vi.mocked(useTrackListContextOptional).mockReturnValue(null);
  });

  it('returns isExcluded=false and toggle=undefined when no context', () => {
    const { result } = renderHook(() => useTrackExclusion(123));
    expect(result.current.isExcluded).toBe(false);
    expect(result.current.toggle).toBeUndefined();
  });

  it('returns isExcluded=false and toggle=undefined when playlistId is absent', () => {
    vi.mocked(useTrackListContextOptional).mockReturnValue({} as ReturnType<typeof useTrackListContextOptional>);
    const { result } = renderHook(() => useTrackExclusion(123));
    expect(result.current.isExcluded).toBe(false);
    expect(result.current.toggle).toBeUndefined();
  });

  it('returns isExcluded=false and toggle defined when track is not excluded', () => {
    vi.mocked(useTrackListContextOptional).mockReturnValue({ playlistId: 'pl-1' } as ReturnType<typeof useTrackListContextOptional>);
    const { result } = renderHook(() => useTrackExclusion(123));
    expect(result.current.isExcluded).toBe(false);
    expect(typeof result.current.toggle).toBe('function');
  });

  it('returns isExcluded=true when track is in the exclusion store', () => {
    act(() => useRekordboxExclusionStore.getState().toggleExcluded('pl-1', 123));
    vi.mocked(useTrackListContextOptional).mockReturnValue({ playlistId: 'pl-1' } as ReturnType<typeof useTrackListContextOptional>);
    const { result } = renderHook(() => useTrackExclusion(123));
    expect(result.current.isExcluded).toBe(true);
  });

  it('toggle adds track to the exclusion store', () => {
    vi.mocked(useTrackListContextOptional).mockReturnValue({ playlistId: 'pl-1' } as ReturnType<typeof useTrackListContextOptional>);
    const { result } = renderHook(() => useTrackExclusion(123));
    act(() => result.current.toggle?.());
    expect(useRekordboxExclusionStore.getState().excludedByPlaylist['pl-1']).toContain(123);
  });

  it('toggle removes track from the exclusion store when already excluded', () => {
    act(() => useRekordboxExclusionStore.getState().toggleExcluded('pl-1', 123));
    vi.mocked(useTrackListContextOptional).mockReturnValue({ playlistId: 'pl-1' } as ReturnType<typeof useTrackListContextOptional>);
    const { result } = renderHook(() => useTrackExclusion(123));
    act(() => result.current.toggle?.());
    expect(useRekordboxExclusionStore.getState().excludedByPlaylist['pl-1']).not.toContain(123);
  });
});
