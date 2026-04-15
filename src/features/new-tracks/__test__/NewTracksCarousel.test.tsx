import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewTracksCarousel } from '../components/NewTracksCarousel';
import { useSettingsStore } from '@/features/settings/store';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'newTracks.title': 'New releases',
        'common.scrollLeft': 'Scroll left',
        'common.scrollRight': 'Scroll right',
        'common.hideReposts': 'Hide reposts',
      };
      return map[key] ?? key;
    },
  }),
}));

const mockArtists = [
  { id: 1, username: 'Artist A', avatar_url: null, has_new_content: true, has_new_original_tracks: true, has_original_tracks: true, has_new_releases: false, has_new_original_releases: false, has_original_releases: false },
  { id: 2, username: 'Artist B', avatar_url: null, has_new_content: true, has_new_original_tracks: false, has_original_tracks: false, has_new_releases: false, has_new_original_releases: false, has_original_releases: false },
  { id: 3, username: 'Artist C', avatar_url: null, has_new_content: false, has_new_original_tracks: false, has_original_tracks: true, has_new_releases: false, has_new_original_releases: false, has_original_releases: false },
];

vi.mock('@/hooks/useFollowedArtists', () => ({
  useFollowedArtists: () => ({
    artists: mockArtists,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('../store', () => ({
  useNewTracksStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ selectedArtist: null })
  ),
}));

describe('NewTracksCarousel', () => {
  beforeEach(() => {
    useSettingsStore.setState({ hideReposts: false });
  });

  it('shows all artists when hideReposts is off', () => {
    render(<NewTracksCarousel onSelectArtist={vi.fn()} />);
    expect(screen.getByText('Artist A')).toBeInTheDocument();
    expect(screen.getByText('Artist B')).toBeInTheDocument();
    expect(screen.getByText('Artist C')).toBeInTheDocument();
  });

  it('hides artists with only reposts when hideReposts is on', () => {
    useSettingsStore.setState({ hideReposts: true });
    render(<NewTracksCarousel onSelectArtist={vi.fn()} />);
    expect(screen.getByText('Artist A')).toBeInTheDocument();
    expect(screen.queryByText('Artist B')).not.toBeInTheDocument();
    expect(screen.getByText('Artist C')).toBeInTheDocument();
  });

  it('toggles hideReposts when checkbox is clicked', () => {
    render(<NewTracksCarousel onSelectArtist={vi.fn()} />);
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    expect(useSettingsStore.getState().hideReposts).toBe(true);
  });
});
