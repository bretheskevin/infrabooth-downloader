import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import { FOLLOWED_ARTISTS_KEY, FOLLOW_STATUS_KEY } from '@/lib/query';
import { getApiErrorMessage } from '@/lib/errorMessages';
import { useIsSignedIn } from '@/features/auth/store';

interface UseFollowArtistResult {
  isFollowing: boolean;
  isLoading: boolean;
  isChecking: boolean;
  toggle: () => void;
}

export function useFollowArtist(artistId: number): UseFollowArtistResult {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isSignedIn = useIsSignedIn();

  const followStatusQuery = useQuery({
    queryKey: [FOLLOW_STATUS_KEY, artistId],
    queryFn: () => api.checkFollowStatus(artistId),
    enabled: isSignedIn,
    staleTime: 60_000,
  });

  const isFollowing = followStatusQuery.data ?? false;

  const followMutation = useMutation({
    mutationFn: () => api.followUser(artistId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [FOLLOW_STATUS_KEY, artistId] });
      queryClient.setQueryData([FOLLOW_STATUS_KEY, artistId], true);
    },
    onSuccess: () => {
      queryClient.setQueryData([FOLLOW_STATUS_KEY, artistId], true);
      void queryClient.invalidateQueries({ queryKey: [...FOLLOWED_ARTISTS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['artist-profile', artistId] });
      void logger.info(`[follow] Followed user ${artistId}`);
    },
    onError: (err) => {
      queryClient.setQueryData([FOLLOW_STATUS_KEY, artistId], false);
      toast.error(getApiErrorMessage(err, t, 'artistProfile.followError'));
      void logger.error(`[follow] Failed to follow user ${artistId}: ${err}`);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => api.unfollowUser(artistId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [FOLLOW_STATUS_KEY, artistId] });
      queryClient.setQueryData([FOLLOW_STATUS_KEY, artistId], false);
    },
    onSuccess: () => {
      queryClient.setQueryData([FOLLOW_STATUS_KEY, artistId], false);
      void queryClient.invalidateQueries({ queryKey: [...FOLLOWED_ARTISTS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['artist-profile', artistId] });
      void logger.info(`[follow] Unfollowed user ${artistId}`);
    },
    onError: (err) => {
      queryClient.setQueryData([FOLLOW_STATUS_KEY, artistId], true);
      toast.error(getApiErrorMessage(err, t, 'artistProfile.unfollowError'));
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
    isChecking: followStatusQuery.isLoading,
    toggle,
  };
}
