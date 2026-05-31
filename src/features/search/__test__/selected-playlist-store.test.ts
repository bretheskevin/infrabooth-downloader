import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectedPlaylistStore } from '../selected-playlist-store';
import type { ArtistPlaylist } from '@/bindings';

const mockPlaylist: ArtistPlaylist = {
  id: 123,
  title: 'Test Playlist',
  artwork_url: 'https://i1.sndcdn.com/artworks-abc.jpg',
  track_count: 10,
  created_at: '2026-01-01T00:00:00Z',
  permalink_url: 'https://soundcloud.com/user/sets/test',
  secret_token: null,
  duration: 3600,
  user: { id: 456, username: 'TestUser' },
};

describe('useSelectedPlaylistStore', () => {
  beforeEach(() => {
    useSelectedPlaylistStore.getState().closePlaylist();
  });

  it('starts with no selected playlist', () => {
    expect(useSelectedPlaylistStore.getState().selectedPlaylist).toBeNull();
  });

  it('opens a playlist', () => {
    useSelectedPlaylistStore.getState().openPlaylist(mockPlaylist);
    expect(useSelectedPlaylistStore.getState().selectedPlaylist).toEqual(mockPlaylist);
  });

  it('closes a playlist', () => {
    useSelectedPlaylistStore.getState().openPlaylist(mockPlaylist);
    useSelectedPlaylistStore.getState().closePlaylist();
    expect(useSelectedPlaylistStore.getState().selectedPlaylist).toBeNull();
  });
});
