import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import { FOLLOWED_ARTISTS_KEY, FOLLOW_STATUS_KEY } from '@/lib/query';
import type { FollowedArtist } from '@/bindings';

interface UseFollowArtistResult {
  isFollowing: boolean;
  isLoading: boolean;
  isChecking: boolean;
  toggle: () => void;
}

export function useFollowArtist(artistId: number): UseFollowArtistResult {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const cachedArtists = queryClient.getQueryData<FollowedArtist[]>([...FOLLOWED_ARTISTS_KEY]);
  const cachedIsFollowing = cachedArtists?.some((a) => a.id === artistId) ?? false;

  const { data: isFollowing = cachedIsFollowing, isLoading: isChecking } = useQuery({
    queryKey: [FOLLOW_STATUS_KEY, artistId],
    queryFn: () => api.checkFollowStatus(artistId),
    staleTime: 30 * 1000,
  });

  const followMutation = useMutation({
    mutationFn: () => api.followUser(artistId),
    onSuccess: () => {
      queryClient.setQueryData([FOLLOW_STATUS_KEY, artistId], true);
      void queryClient.invalidateQueries({ queryKey: [...FOLLOWED_ARTISTS_KEY] });
      void logger.info(`[follow] Followed user ${artistId}`);
    },
    onError: (err) => {
      toast.error(t('artistProfile.followError'));
      void logger.error(`[follow] Failed to follow user ${artistId}: ${err}`);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => api.unfollowUser(artistId),
    onSuccess: () => {
      queryClient.setQueryData([FOLLOW_STATUS_KEY, artistId], false);
      void queryClient.invalidateQueries({ queryKey: [...FOLLOWED_ARTISTS_KEY] });
      void logger.info(`[follow] Unfollowed user ${artistId}`);
    },
    onError: (err) => {
      toast.error(t('artistProfile.unfollowError'));
      void logger.error(`[follow] Failed to unfollow user ${artistId}: ${err}`);
    },
  });

  const toggle = useCallback(() => {
    if (followMutation.isPending || unfollowMutation.isPending) return;
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  }, [isFollowing, followMutation, unfollowMutation]);

  return {
    isFollowing,
    isLoading: followMutation.isPending || unfollowMutation.isPending,
    isChecking,
    toggle,
  };
}
