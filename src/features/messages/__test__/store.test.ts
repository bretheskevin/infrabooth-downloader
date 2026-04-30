import { describe, it, expect, beforeEach } from 'vitest';
import { useMessagesStore } from '../store';

describe('useMessagesStore', () => {
  beforeEach(() => {
    useMessagesStore.getState().clear();
  });

  describe('openPage', () => {
    it('sets isPageOpen to true', () => {
      expect(useMessagesStore.getState().isPageOpen).toBe(false);

      useMessagesStore.getState().openPage();

      expect(useMessagesStore.getState().isPageOpen).toBe(true);
    });

    it('resets selectedConversation to null', () => {
      useMessagesStore.getState().openConversation({
        otherUserId: 1,
        username: 'test',
        avatarUrl: null,
        permalinkUrl: 'https://soundcloud.com/test',
      });
      expect(useMessagesStore.getState().selectedConversation).not.toBeNull();

      useMessagesStore.getState().openPage();

      expect(useMessagesStore.getState().selectedConversation).toBeNull();
    });

    it('resets selectedPlaylist to null', () => {
      useMessagesStore.getState().openPage();

      expect(useMessagesStore.getState().selectedPlaylist).toBeNull();
    });
  });
});
