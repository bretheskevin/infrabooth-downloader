import { describe, it, expect } from 'vitest';
import type { ArtistPlaylist } from '@/bindings';
import { fromArtistPlaylist } from '../types';

function makePlaylist(overrides: Partial<ArtistPlaylist> = {}): ArtistPlaylist {
  return {
    id: 100,
    title: 'Test Playlist',
    artwork_url: null,
    track_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    permalink_url: 'https://soundcloud.com/test/playlist',
    secret_token: null,
    ...overrides,
  };
}

describe('fromArtistPlaylist', () => {
  it('returns isOwned true when embedded user.id matches authUserId', () => {
    const playlist = makePlaylist({ user: { id: 42, username: 'owner' } });
    const result = fromArtistPlaylist(playlist, 'Artist', 42);
    expect(result.isOwned).toBe(true);
    expect(result.userId).toBe(42);
  });

  it('returns isOwned true when no embedded user but ownerId matches authUserId', () => {
    const playlist = makePlaylist({ user: null });
    const result = fromArtistPlaylist(playlist, 'Artist', 42, 42);
    expect(result.isOwned).toBe(true);
    expect(result.userId).toBe(42);
  });

  it('returns isOwned false when ownerId is present but does not match authUserId', () => {
    const playlist = makePlaylist({ user: null });
    const result = fromArtistPlaylist(playlist, 'Artist', 42, 99);
    expect(result.isOwned).toBe(false);
    expect(result.userId).toBe(99);
  });

  it('returns isOwned false when no user and no ownerId', () => {
    const playlist = makePlaylist({ user: null });
    const result = fromArtistPlaylist(playlist, 'Artist', 42);
    expect(result.isOwned).toBe(false);
    expect(result.userId).toBeNull();
  });

  it('prefers embedded user over ownerId', () => {
    const playlist = makePlaylist({ user: { id: 42, username: 'owner' } });
    const result = fromArtistPlaylist(playlist, 'Artist', 42, 99);
    expect(result.isOwned).toBe(true);
    expect(result.userId).toBe(42);
    expect(result.username).toBe('owner');
  });

  it('uses artistName as username when no embedded user', () => {
    const playlist = makePlaylist({ user: null });
    const result = fromArtistPlaylist(playlist, 'FallbackArtist', null, 50);
    expect(result.username).toBe('FallbackArtist');
  });
});
