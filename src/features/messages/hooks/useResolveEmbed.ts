import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useIsSignedIn } from '@/features/auth/store';
import { normalizeShortUrl } from '@/lib/soundcloud';
import type { MessageEmbed } from '@/bindings';

const SC_URL_PATTERN = /(?:https?:\/\/(?:on\.)?soundcloud\.com|on\.soundcloud\.com)\/\S+/;

export function extractScUrl(content: string): { raw: string; normalized: string } | null {
  const match = content.match(SC_URL_PATTERN);
  if (!match) return null;
  const raw = match[0];
  return { raw, normalized: normalizeShortUrl(raw) };
}

export function embedQueryKey(normalizedUrl: string): readonly [string, string, string] {
  return ['directMessages', 'embed', normalizedUrl] as const;
}

export function useResolveEmbed(content: string) {
  const isSignedIn = useIsSignedIn();
  const result = extractScUrl(content);
  const url = result?.normalized ?? null;
  const rawUrl = result?.raw ?? null;

  const query = useQuery({
    queryKey: url ? embedQueryKey(url) : ['directMessages', 'embed', null],
    queryFn: () => api.resolveMessageEmbed(url!),
    enabled: isSignedIn && !!url,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

  return {
    embed: query.data ?? (null as MessageEmbed | null),
    scUrl: url,
    rawScUrl: rawUrl,
    isLoading: query.isLoading && !!url,
  };
}
