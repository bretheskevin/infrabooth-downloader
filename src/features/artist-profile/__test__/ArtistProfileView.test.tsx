import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useArtistProfileStore } from '../store';
import type { ArtistProfile } from '@/bindings';
import { ArtistProfileView } from '../components/ArtistProfileView';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/player/url-cache', () => ({
  preloadOnHover: vi.fn(),
  preloadImmediate: vi.fn(),
}));

vi.mock('@/features/player/store', async () => {
  const { create } = await import('zustand');
  const store = create(() => ({
    currentTrack: null,
    state: 'idle',
    pause: vi.fn(),
    resume: vi.fn(),
  }));
  return { usePlayerStore: store };
});

vi.mock('@/hooks/useDownloadState', async () => {
  const { create } = await import('zustand');
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
  followings_count: 320,
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

vi.mock('../hooks/useArtistLikedTracks', () => ({
  useArtistLikedTracks: () => ({
    data: undefined,
    isLoading: false,
    isStreaming: false,
  }),
}));

vi.mock('../hooks/useArtistPlaylists', () => ({
  useArtistPlaylists: () => ({
    data: undefined,
    isLoading: false,
    isStreaming: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useArtistAlbums', () => ({
  useArtistAlbums: () => ({
    data: undefined,
    isLoading: false,
    isStreaming: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/settings', () => ({
  useIsDownloadEnabled: () => true,
}));

vi.mock('@/features/settings/store', () => ({
  useSettingsStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) => selector({ downloadPath: '/test/downloads' })),
}));

vi.mock('../hooks/useFollowArtist', () => ({
  useFollowArtist: () => ({
    isFollowing: false,
    isLoading: false,
    isChecking: false,
    toggle: vi.fn(),
  }),
}));

vi.mock('@/features/auth/store', () => ({
  useIsSignedIn: () => false,
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) => selector({ isSignedIn: false, username: null }),
}));

vi.mock('@/hooks/useTrackDownloadState', () => ({
  useTrackDownloadState: () => ({
    downloadTrack: vi.fn(),
    downloadedIds: new Set<number>(),
  }),
}));

vi.mock('@/hooks/useTrackSelection', () => ({
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
  usePlayerStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) => selector({ isQueueOpen: false })),
}));

vi.mock('@/features/player/hooks/useIsExpandedBarVisible', () => ({
  useIsExpandedBarVisible: () => false,
}));

vi.mock('@/features/player/components/ExpandedBar', () => ({
  EXPANDED_BAR_HEIGHT: 64,
}));

vi.mock('@/features/rekordbox-export/hooks/useRekordboxDetection', () => ({
  useRekordboxDetection: () => ({ data: { found: true } }),
}));

describe('useArtistProfileStore', () => {
  beforeEach(() => {
    useArtistProfileStore.setState({
      profileArtistId: null,
      profileArtistName: null,
      activeFollowView: null,
      profileStack: [],
    });
  });

  it('starts with null values and empty stack', () => {
    const state = useArtistProfileStore.getState();
    expect(state.profileArtistId).toBeNull();
    expect(state.profileArtistName).toBeNull();
    expect(state.activeFollowView).toBeNull();
    expect(state.profileStack).toEqual([]);
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
    expect(state.activeFollowView).toBeNull();
    expect(state.profileStack).toEqual([]);
  });

  it('pushes to stack when opening profile from within a profile', () => {
    useArtistProfileStore.getState().openProfile(1, 'First');
    useArtistProfileStore.getState().openProfile(2, 'Second');
    const state = useArtistProfileStore.getState();
    expect(state.profileArtistId).toBe(2);
    expect(state.profileArtistName).toBe('Second');
    expect(state.profileStack).toHaveLength(1);
    expect(state.profileStack[0]).toEqual({
      artistId: 1,
      artistName: 'First',
      followView: null,
    });
  });

  it('does not push to stack when opening profile from outside', () => {
    useArtistProfileStore.getState().openProfile(42, 'DJ Test');
    const state = useArtistProfileStore.getState();
    expect(state.profileStack).toEqual([]);
  });

  it('sets activeFollowView and pushes current state to stack', () => {
    useArtistProfileStore.getState().openProfile(42, 'DJ Test');
    useArtistProfileStore.getState().openFollowView('followers');
    const state = useArtistProfileStore.getState();
    expect(state.activeFollowView).toBe('followers');
    expect(state.profileStack).toHaveLength(1);
    expect(state.profileStack[0]).toEqual({
      artistId: 42,
      artistName: 'DJ Test',
      followView: null,
    });
  });

  it('goBack pops stack and restores state', () => {
    useArtistProfileStore.getState().openProfile(1, 'First');
    useArtistProfileStore.getState().openFollowView('followers');
    useArtistProfileStore.getState().openProfile(2, 'Second');

    useArtistProfileStore.getState().goBack();
    let state = useArtistProfileStore.getState();
    expect(state.profileArtistId).toBe(1);
    expect(state.activeFollowView).toBe('followers');

    useArtistProfileStore.getState().goBack();
    state = useArtistProfileStore.getState();
    expect(state.profileArtistId).toBe(1);
    expect(state.activeFollowView).toBeNull();

    useArtistProfileStore.getState().goBack();
    state = useArtistProfileStore.getState();
    expect(state.profileArtistId).toBeNull();
  });

  it('full navigation: A > followers > B > back > back > back closes', () => {
    const { openProfile, openFollowView, goBack } = useArtistProfileStore.getState();

    openProfile(1, 'Artist A');
    openFollowView('followers');
    openProfile(2, 'Artist B');

    goBack();
    expect(useArtistProfileStore.getState().profileArtistId).toBe(1);
    expect(useArtistProfileStore.getState().activeFollowView).toBe('followers');

    goBack();
    expect(useArtistProfileStore.getState().profileArtistId).toBe(1);
    expect(useArtistProfileStore.getState().activeFollowView).toBeNull();

    goBack();
    expect(useArtistProfileStore.getState().profileArtistId).toBeNull();
  });
});

describe('ArtistProfileView', () => {
  beforeEach(() => {
    mockProfileState.data = undefined;
    mockProfileState.isLoading = false;
  });

  it('renders loading skeletons when profile is loading', () => {
    mockProfileState.isLoading = true;

    const { container } = render(<ArtistProfileView artistId={42} artistName="DJ Test" onDownloadTracks={vi.fn()} />);

    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders artist name in header when profile is loaded', () => {
    mockProfileState.data = mockProfile;

    render(<ArtistProfileView artistId={42} artistName="DJ Test" onDownloadTracks={vi.fn()} />);

    expect(screen.getAllByText('DJ Test').length).toBeGreaterThanOrEqual(1);
  });

  it('renders follower and track counts when profile is loaded', () => {
    mockProfileState.data = mockProfile;

    render(<ArtistProfileView artistId={42} artistName="DJ Test" onDownloadTracks={vi.fn()} />);

    expect(screen.getByText('12.5K')).toBeInTheDocument();
    expect(screen.getByText('artistProfile.followers')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('artistProfile.tracks')).toBeInTheDocument();
  });

  it('renders description when profile has one', () => {
    mockProfileState.data = mockProfile;

    render(<ArtistProfileView artistId={42} artistName="DJ Test" onDownloadTracks={vi.fn()} />);

    expect(screen.getByText('An electronic music producer')).toBeInTheDocument();
  });
});
