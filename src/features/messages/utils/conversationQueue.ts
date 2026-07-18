import type { QueryClient } from '@tanstack/react-query';
import type { ConversationMessage, MessageEmbed, MessageTrackEmbed } from '@/bindings';
import type { PlaybackItem } from '@/features/player';
import { extractScUrl, embedQueryKey } from '../hooks/useResolveEmbed';

export function toPlaybackItem(embed: MessageTrackEmbed): PlaybackItem {
  return {
    trackId: embed.id,
    trackUrl: embed.permalink_url,
    title: embed.title,
    artist: embed.artist,
    artistId: embed.artist_id,
    artworkUrl: embed.artwork_url,
    durationMs: embed.duration_ms,
    waveformUrl: embed.waveform_url,
  };
}

export function readCachedTrackEmbed(content: string, queryClient: QueryClient): MessageTrackEmbed | null {
  const parsed = extractScUrl(content);
  if (!parsed) return null;
  const embed = queryClient.getQueryData<MessageEmbed>(embedQueryKey(parsed.normalized));
  if (!embed || embed.kind !== 'Track') return null;
  return embed;
}

export function buildConversationQueue(items: ConversationMessage[], clickedIndex: number, queryClient: QueryClient): PlaybackItem[] {
  return items
    .slice(0, clickedIndex + 1)
    .reverse()
    .map((msg) => readCachedTrackEmbed(msg.content, queryClient))
    .filter((embed): embed is MessageTrackEmbed => embed !== null)
    .map(toPlaybackItem);
}
