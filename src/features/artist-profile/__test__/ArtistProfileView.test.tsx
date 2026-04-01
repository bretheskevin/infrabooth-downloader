import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useArtistProfileStore } from '../store';
import type { ArtistProfile } from '@/bindings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/player/url-cache', () => ({
  preloadOnHover: vi.fn(),
  preloadImmediate: vi.fn(),
}));

vi.mock('@/features/player/store', () => {
  const { create } = require('zustand');
  const store = create(() => ({
    currentTrack: null,
    state: 'idle',
    pause: vi.fn(),
    resume: vi.fn(),
  }));
  return { usePlayerStore: store };
});

vi.mock('@/hooks/useDownloadState', () => {
  const { create } = require('zustand');
  const store = create(() => ({
    states: new Map(),
    completedCount: 0,
  }));
  return { useDownloadStateStore: store };
});

const mockProfile: ArtistProfile = {
  id: 42,
  username: 'DJ Test',
  avatar_url: 'https://i1.sndcdn.com/avatars-test.jpg',
  description: 'An electronic music producer',
  followers_count: 12500,
  track_count: 45,
  permalink_url: 'https://soundcloud.com/dj-test',
  visuals: null,
};

const mockProfileState = { data: undefined as ArtistProfile | undefined, isLoading: false };

vi.mock('../hooks/useArtistProfile', () => ({
  useArtistProfile: () => ({
    data: mockProfileState.data,
    isLoading: mockProfileState.isLoading,
    error: null,
  }),
}));

vi.mock('../hooks/useArtistTracks', () => ({
  useArtistTracks: () => ({
    data: undefined,
    isLoading: false,
    isStreaming: false,
  }),
}));

vi.mock('@/features/settings', () => ({
  useIsDownloadEnabled: () => true,
}));

vi.mock('@/features/settings/store', () => ({
  useSettingsStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ downloadPath: '/test/downloads' }),
  ),
}));

vi.mock('@/hooks/useTrackDownloadState', () => ({
  useTrackDownloadState: () => ({
    downloadTrack: vi.fn(),
    downloadedIds: new Set<number>(),
  }),
}));

vi.mock('@/features/library/hooks/useTrackSelection', () => ({
  useTrackSelection: () => ({
    selectedIds: new Set<number>(),
    toggleTrack: vi.fn(),
    toggleAll: vi.fn(),
    clearSelection: vi.fn(),
    selectedCount: 0,
    isAllSelected: false,
    selectedTracks: [],
    selectableCount: 0,
  }),
}));

vi.mock('@/features/player', () => ({
  usePlayContext: () => ({ playTrack: vi.fn() }),
  usePlayerStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ isQueueOpen: false }),
  ),
}));

vi.mock('@/features/player/hooks/useIsExpandedBarVisible', () => ({
  useIsExpandedBarVisible: () => false,
}));

vi.mock('@/features/player/components/ExpandedBar', () => ({
  EXPANDED_BAR_HEIGHT: 64,
}));

describe('useArtistProfileStore', () => {
  beforeEach(() => {
    useArtistProfileStore.setState({
      profileArtistId: null,
      profileArtistName: null,
    });
  });

  it('starts with null values', () => {
    const state = useArtistProfileStore.getState();
    expect(state.profileArtistId).toBeNull();
    expect(state.profileArtistName).toBeNull();
  });

  it('sets artist id and name on openProfile', () => {
    useArtistProfileStore.getState().openProfile(42, 'DJ Test');
    const state = useArtistProfileStore.getState();
    expect(state.profileArtistId).toBe(42);
    expect(state.profileArtistName).toBe('DJ Test');
  });

  it('resets to null on closeProfile', () => {
    useArtistProfileStore.getState().openProfile(42, 'DJ Test');
    useArtistProfileStore.getState().closeProfile();
    const state = useArtistProfileStore.getState();
    expect(state.profileArtistId).toBeNull();
    expect(state.profileArtistName).toBeNull();
  });

  it('replaces previous profile when opening a new one', () => {
    useArtistProfileStore.getState().openProfile(1, 'First');
    useArtistProfileStore.getState().openProfile(2, 'Second');
    const state = useArtistProfileStore.getState();
    expect(state.profileArtistId).toBe(2);
    expect(state.profileArtistName).toBe('Second');
  });
});

describe('ArtistProfileView', () => {
  beforeEach(() => {
    mockProfileState.data = undefined;
    mockProfileState.isLoading = false;
  });

  it('renders loading skeletons when profile is loading', async () => {
    mockProfileState.isLoading = true;

    const { ArtistProfileView } = await import('../components/ArtistProfileView');
    const { container } = render(
      <ArtistProfileView
        artistId={42}
        artistName="DJ Test"
        onBack={vi.fn()}
        onDownloadTracks={vi.fn()}
      />,
    );

    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders artist name in header when profile is loaded', async () => {
    mockProfileState.data = mockProfile;

    const { ArtistProfileView } = await import('../components/ArtistProfileView');
    render(
      <ArtistProfileView
        artistId={42}
        artistName="DJ Test"
        onBack={vi.fn()}
        onDownloadTracks={vi.fn()}
      />,
    );

    expect(screen.getAllByText('DJ Test').length).toBeGreaterThanOrEqual(1);
  });

  it('renders follower and track counts when profile is loaded', async () => {
    mockProfileState.data = mockProfile;

    const { ArtistProfileView } = await import('../components/ArtistProfileView');
    render(
      <ArtistProfileView
        artistId={42}
        artistName="DJ Test"
        onBack={vi.fn()}
        onDownloadTracks={vi.fn()}
      />,
    );

    expect(screen.getByText('12.5K')).toBeInTheDocument();
    expect(screen.getByText('artistProfile.followers')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('artistProfile.tracks')).toBeInTheDocument();
  });

  it('renders description when profile has one', async () => {
    mockProfileState.data = mockProfile;

    const { ArtistProfileView } = await import('../components/ArtistProfileView');
    render(
      <ArtistProfileView
        artistId={42}
        artistName="DJ Test"
        onBack={vi.fn()}
        onDownloadTracks={vi.fn()}
      />,
    );

    expect(screen.getByText('An electronic music producer')).toBeInTheDocument();
  });

});
