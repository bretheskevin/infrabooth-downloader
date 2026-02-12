import { useQueueStore } from '@/features/download/store';

/**
 * Hook to access rate limit status from the queue store.
 * Used by RateLimitBanner for conditional rendering.
 */
export function useRateLimitStatus() {
  const isRateLimited = useQueueStore((state) => state.isRateLimited);
  const rateLimitedAt = useQueueStore((state) => state.rateLimitedAt);

  return {
    isRateLimited,
    rateLimitedAt,
  };
}
