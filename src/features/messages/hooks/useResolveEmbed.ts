import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useIsSignedIn } from '@/features/auth/store';
import type { MessageTrackEmbed, MessagePlaylistEmbed } from '@/bindings';

const SC_URL_PATTERN = /https?:\/\/(?:on\.)?soundcloud\.com\/\S+/;

function extractScUrl(content: string): string | null {
  const match = content.match(SC_URL_PATTERN);
  return match ? match[0] : null;
}

export function useResolveEmbed(content: string) {
  const isSignedIn = useIsSignedIn();
  const url = extractScUrl(content);

  const query = useQuery({
    queryKey: ['directMessages', 'embed', url],
    queryFn: () => api.resolveMessageEmbed(url!),
    enabled: isSignedIn && !!url,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

  const embed = query.data ?? null;

  return {
    trackEmbed: (embed?.kind === 'Track' ? embed : null) as MessageTrackEmbed | null,
    playlistEmbed: (embed?.kind === 'Playlist' ? embed : null) as MessagePlaylistEmbed | null,
    scUrl: url,
    isLoading: query.isLoading && !!url,
  };
}
