import { describe, it, expect } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';
import type { ConversationMessage, MessageEmbed, MessageTrackEmbed } from '@/bindings';
import { buildConversationQueue } from '../conversationQueue';

function createTrackEmbed(id: number, url: string): MessageTrackEmbed & { kind: 'Track' } {
  return {
    kind: 'Track',
    id,
    title: `Track ${id}`,
    artist: 'Artist',
    artist_id: 1,
    artwork_url: null,
    waveform_url: null,
    duration_ms: 180000,
    permalink_url: url,
  };
}

function createMessage(content: string): ConversationMessage {
  return { content, sender_id: 1, sent_at: new Date().toISOString(), track_embed: null };
}

function createMockQueryClient(cache: Record<string, MessageEmbed>): QueryClient {
  return {
    getQueryData: (key: readonly unknown[]) => {
      const url = key[2] as string;
      return cache[url] ?? undefined;
    },
  } as unknown as QueryClient;
}

const trackUrl = (id: number) => `https://soundcloud.com/artist/track-${id}`;
const scUrl = (id: number) => `https://soundcloud.com/artist/track-${id}`;

describe('buildConversationQueue', () => {
  it('builds chronological queue: clicked track first, then later tracks', () => {
    const items = [createMessage(scUrl(3)), createMessage(scUrl(2)), createMessage(scUrl(1))];
    const cache: Record<string, MessageEmbed> = {
      [trackUrl(1)]: createTrackEmbed(1, trackUrl(1)),
      [trackUrl(2)]: createTrackEmbed(2, trackUrl(2)),
      [trackUrl(3)]: createTrackEmbed(3, trackUrl(3)),
    };
    const queue = buildConversationQueue(items, 1, createMockQueryClient(cache));
    expect(queue).toHaveLength(2);
    expect(queue[0]!.trackId).toBe(2);
    expect(queue[1]!.trackId).toBe(3);
  });

  it('excludes tracks sent before the clicked one (higher index)', () => {
    const items = [createMessage(scUrl(3)), createMessage(scUrl(2)), createMessage(scUrl(1))];
    const cache: Record<string, MessageEmbed> = {
      [trackUrl(1)]: createTrackEmbed(1, trackUrl(1)),
      [trackUrl(2)]: createTrackEmbed(2, trackUrl(2)),
      [trackUrl(3)]: createTrackEmbed(3, trackUrl(3)),
    };
    const queue = buildConversationQueue(items, 1, createMockQueryClient(cache));
    expect(queue.map((q) => q.trackId)).not.toContain(1);
  });

  it('skips non-track embeds interleaved between tracks', () => {
    const playlistUrl = 'https://soundcloud.com/artist/sets/my-playlist';
    const items = [createMessage(scUrl(3)), createMessage(playlistUrl), createMessage(scUrl(1))];
    const cache: Record<string, MessageEmbed> = {
      [trackUrl(1)]: createTrackEmbed(1, trackUrl(1)),
      [trackUrl(3)]: createTrackEmbed(3, trackUrl(3)),
      [playlistUrl]: {
        kind: 'Playlist',
        id: 99,
        title: 'PL',
        artist: 'Artist',
        artist_id: 1,
        track_count: 5,
        artwork_url: null,
        permalink_url: playlistUrl,
        secret_token: null,
      } as MessageEmbed,
    };
    const queue = buildConversationQueue(items, 2, createMockQueryClient(cache));
    expect(queue).toHaveLength(2);
    expect(queue[0]!.trackId).toBe(1);
    expect(queue[1]!.trackId).toBe(3);
  });

  it('skips messages whose embed is not in cache', () => {
    const items = [createMessage(scUrl(3)), createMessage(scUrl(2)), createMessage(scUrl(1))];
    const cache: Record<string, MessageEmbed> = {
      [trackUrl(1)]: createTrackEmbed(1, trackUrl(1)),
      [trackUrl(3)]: createTrackEmbed(3, trackUrl(3)),
    };
    const queue = buildConversationQueue(items, 2, createMockQueryClient(cache));
    expect(queue).toHaveLength(2);
    expect(queue[0]!.trackId).toBe(1);
    expect(queue[1]!.trackId).toBe(3);
  });

  it('skips messages with no SoundCloud URL', () => {
    const items = [createMessage(scUrl(2)), createMessage('hey check this out'), createMessage(scUrl(1))];
    const cache: Record<string, MessageEmbed> = {
      [trackUrl(1)]: createTrackEmbed(1, trackUrl(1)),
      [trackUrl(2)]: createTrackEmbed(2, trackUrl(2)),
    };
    const queue = buildConversationQueue(items, 2, createMockQueryClient(cache));
    expect(queue).toHaveLength(2);
    expect(queue[0]!.trackId).toBe(1);
    expect(queue[1]!.trackId).toBe(2);
  });

  it('returns single-item queue when clicked track is the most recent (index 0)', () => {
    const items = [createMessage(scUrl(3)), createMessage(scUrl(2)), createMessage(scUrl(1))];
    const cache: Record<string, MessageEmbed> = { [trackUrl(3)]: createTrackEmbed(3, trackUrl(3)) };
    const queue = buildConversationQueue(items, 0, createMockQueryClient(cache));
    expect(queue).toHaveLength(1);
    expect(queue[0]!.trackId).toBe(3);
  });

  it('maps MessageTrackEmbed fields to PlaybackItem correctly', () => {
    const items = [createMessage(scUrl(1))];
    const cache: Record<string, MessageEmbed> = { [trackUrl(1)]: createTrackEmbed(1, trackUrl(1)) };
    const queue = buildConversationQueue(items, 0, createMockQueryClient(cache));
    expect(queue[0]!).toEqual({
      trackId: 1,
      trackUrl: trackUrl(1),
      title: 'Track 1',
      artist: 'Artist',
      artistId: 1,
      artworkUrl: null,
      durationMs: 180000,
      waveformUrl: null,
    });
  });
});
