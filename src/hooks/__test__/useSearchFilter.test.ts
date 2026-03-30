import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchFilter } from '../useSearchFilter';
import type { TrackInfo } from '@/bindings';

const makeTracks = (): TrackInfo[] => [
  { id: 1, title: 'Acid Rain', user: { id: 0, username: 'DJ Kandid', avatar_url: null }, artwork_url: null, duration: 240000, permalink_url: '', waveform_url: null, downloadable: false, download_url: null },
  { id: 2, title: 'Tekno Drive', user: { id: 0, username: 'Anetha', avatar_url: null }, artwork_url: null, duration: 300000, permalink_url: '', waveform_url: null, downloadable: false, download_url: null },
  { id: 3, title: 'Hard Pulse', user: { id: 0, username: 'SPFDJ', avatar_url: null }, artwork_url: null, duration: 180000, permalink_url: '', waveform_url: null, downloadable: false, download_url: null },
];

describe('useSearchFilter', () => {
  const tracks = makeTracks();

  it('returns all tracks when search query is empty', () => {
    const { result } = renderHook(() => useSearchFilter(tracks));
    expect(result.current.filteredTracks).toHaveLength(3);
    expect(result.current.searchQuery).toBe('');
  });

  it('filters tracks when search query is set', () => {
    const { result } = renderHook(() => useSearchFilter(tracks));

    act(() => {
      result.current.setSearchQuery('acid');
    });

    expect(result.current.filteredTracks).toHaveLength(1);
    expect(result.current.filteredTracks[0]?.title).toBe('Acid Rain');
  });

  it('updates filtered tracks when input tracks change', () => {
    const { result, rerender } = renderHook(
      ({ t }) => useSearchFilter(t),
      { initialProps: { t: tracks } },
    );

    act(() => {
      result.current.setSearchQuery('acid');
    });
    expect(result.current.filteredTracks).toHaveLength(1);

    rerender({ t: [] });
    expect(result.current.filteredTracks).toHaveLength(0);
  });

  it('returns stable setSearchQuery reference', () => {
    const { result, rerender } = renderHook(() => useSearchFilter(tracks));
    const first = result.current.setSearchQuery;

    rerender();
    expect(result.current.setSearchQuery).toBe(first);
  });
});
