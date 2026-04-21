import { create } from 'zustand';

interface ProfileStackEntry {
  artistId: number;
  artistName: string;
  followView: 'followers' | 'followings' | null;
}

interface ArtistProfileState {
  profileArtistId: number | null;
  profileArtistName: string | null;
  activeFollowView: 'followers' | 'followings' | null;
  profileStack: ProfileStackEntry[];
  openProfile: (artistId: number, artistName: string) => void;
  openFollowView: (view: 'followers' | 'followings') => void;
  goBack: () => void;
  closeProfile: () => void;
}

export const useArtistProfileStore = create<ArtistProfileState>((set, get) => {
  const currentEntry = (): ProfileStackEntry => ({
    artistId: get().profileArtistId!,
    artistName: get().profileArtistName ?? '',
    followView: get().activeFollowView,
  });

  return {
  profileArtistId: null,
  profileArtistName: null,
  activeFollowView: null,
  profileStack: [],

  openProfile: (artistId, artistName) => {
    if (artistId <= 0) return;
    const { profileArtistId, profileStack } = get();
    const stack = profileArtistId !== null ? [...profileStack, currentEntry()] : [];
    set({ profileArtistId: artistId, profileArtistName: artistName, activeFollowView: null, profileStack: stack });
  },

  openFollowView: (view) => {
    const { profileArtistId, profileStack } = get();
    if (!profileArtistId) return;
    set({ activeFollowView: view, profileStack: [...profileStack, currentEntry()] });
  },

  goBack: () => {
    const { profileStack } = get();
    if (profileStack.length === 0) {
      get().closeProfile();
      return;
    }
    const prev = profileStack[profileStack.length - 1]!;
    set({
      profileArtistId: prev.artistId,
      profileArtistName: prev.artistName,
      activeFollowView: prev.followView,
      profileStack: profileStack.slice(0, -1),
    });
  },

  closeProfile: () => set({
    profileArtistId: null,
    profileArtistName: null,
    activeFollowView: null,
    profileStack: [],
  }),
};
});
