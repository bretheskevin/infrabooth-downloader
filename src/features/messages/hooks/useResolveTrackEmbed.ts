import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useIsSignedIn } from '@/features/auth/store';

const SC_URL_PATTERN = /https?:\/\/(?:on\.)?soundcloud\.com\/\S+/;

function extractScUrl(content: string): string | null {
  const match = content.match(SC_URL_PATTERN);
  return match ? match[0] : null;
}

export function useResolveTrackEmbed(content: string) {
  const isSignedIn = useIsSignedIn();
  const url = extractScUrl(content);

  const query = useQuery({
    queryKey: ['directMessages', 'embed', url],
    queryFn: () => api.resolveMessageTrackEmbed(url!),
    enabled: isSignedIn && !!url,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

  return {
    embed: query.data ?? null,
    scUrl: url,
    isLoading: query.isLoading && !!url,
  };
}
