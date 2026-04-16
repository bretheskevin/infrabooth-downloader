import { create } from 'zustand';
import type { MessagePlaylistEmbed } from '@/bindings';

interface SelectedConversation {
  otherUserId: number;
  username: string;
  avatarUrl: string | null;
}

interface MessagesState {
  isPageOpen: boolean;
  selectedConversation: SelectedConversation | null;
  selectedPlaylist: MessagePlaylistEmbed | null;
  openConversation: (conv: SelectedConversation) => void;
  openPlaylist: (embed: MessagePlaylistEmbed) => void;
  closePlaylist: () => void;
  clear: () => void;
}

export const useMessagesStore = create<MessagesState>((set) => ({
  isPageOpen: false,
  selectedConversation: null,
  selectedPlaylist: null,
  openConversation: (conv) => set({ isPageOpen: true, selectedConversation: conv }),
  openPlaylist: (embed) => set({ selectedPlaylist: embed }),
  closePlaylist: () => set({ selectedPlaylist: null }),
  clear: () => set({ isPageOpen: false, selectedConversation: null, selectedPlaylist: null }),
}));
