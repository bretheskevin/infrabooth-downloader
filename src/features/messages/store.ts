import { create } from "zustand";
import type { MessagePlaylistEmbed } from "@/bindings";

interface SelectedConversation {
  otherUserId: number;
  username: string;
  avatarUrl: string | null;
  permalinkUrl: string;
}

export interface ShareTrackInfo {
  trackId: number;
  title: string;
  artist: string;
  artworkUrl: string | null;
  permalinkUrl: string;
}

interface MessagesState {
  isPageOpen: boolean;
  selectedConversation: SelectedConversation | null;
  selectedPlaylist: MessagePlaylistEmbed | null;
  openPage: () => void;
  openConversation: (conv: SelectedConversation) => void;
  openPlaylist: (embed: MessagePlaylistEmbed) => void;
  closePlaylist: () => void;
  clear: () => void;
  shareDialogTrack: ShareTrackInfo | null;
  openShareDialog: (track: ShareTrackInfo) => void;
  closeShareDialog: () => void;
}

export const useMessagesStore = create<MessagesState>((set) => ({
  isPageOpen: false,
  selectedConversation: null,
  selectedPlaylist: null,
  openPage: () =>
    set({
      isPageOpen: true,
      selectedConversation: null,
      selectedPlaylist: null,
    }),
  openConversation: (conv) =>
    set({
      isPageOpen: true,
      selectedConversation: conv,
      selectedPlaylist: null,
    }),
  openPlaylist: (embed) => set({ selectedPlaylist: embed }),
  closePlaylist: () => set({ selectedPlaylist: null }),
  clear: () =>
    set({
      isPageOpen: false,
      selectedConversation: null,
      selectedPlaylist: null,
    }),
  shareDialogTrack: null,
  openShareDialog: (track) => set({ shareDialogTrack: track }),
  closeShareDialog: () => set({ shareDialogTrack: null }),
}));
