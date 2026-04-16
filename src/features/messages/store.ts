import { create } from 'zustand';

interface SelectedConversation {
  otherUserId: number;
  username: string;
  avatarUrl: string | null;
}

interface MessagesState {
  isPageOpen: boolean;
  selectedConversation: SelectedConversation | null;
  openConversation: (conv: SelectedConversation) => void;
  clear: () => void;
}

export const useMessagesStore = create<MessagesState>((set) => ({
  isPageOpen: false,
  selectedConversation: null,
  openConversation: (conv) => set({ isPageOpen: true, selectedConversation: conv }),
  clear: () => set({ isPageOpen: false, selectedConversation: null }),
}));
