import { useQuery } from '@tanstack/react-query';
import { commands } from '@/bindings';
import { logger } from '@/lib/logger';

async function fetchLocalApiActive(): Promise<boolean> {
  const active = await commands.isLocalApiActive();
  void logger.info(`[remote] local API active: ${active}`);
  return active;
}

export function useLocalApiActive(): boolean {
  const { data } = useQuery({ queryKey: ['remote', 'localApiActive'], queryFn: fetchLocalApiActive, staleTime: Infinity });
  return data ?? false;
}
