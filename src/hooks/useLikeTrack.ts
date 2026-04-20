import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import { LIKED_TRACKS_KEY } from '@/lib/query';
import { useAuthStore } from '@/features/auth/store';
import type { TrackInfo } from '@/bindings';

export interface LikeState {
  isLiked: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

export function useLikeTrack(track?: TrackInfo): LikeState | undefined {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const username = useAuthStore((s) => s.username);

  const likedQueryKey = [LIKED_TRACKS_KEY, username] as const;

  const likedStatus = useQuery({
    queryKey: likedQueryKey,
    enabled: false,
    select: (data: TrackInfo[] | undefined) =>
      track ? (data?.some((t) => t.id === track.id) ?? false) : false,
  });

  const isLiked = likedStatus.data ?? false;

  const likeMutation = useMutation({
    mutationFn: async (nextLiked: boolean) => {
      if (!track) return;
      if (nextLiked) {
        await api.likeTrack(track.id);
      } else {
        await api.unlikeTrack(track.id);
      }
    },
    onMutate: async (nextLiked: boolean) => {
      if (!track) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: likedQueryKey });
      const previous = queryClient.getQueryData<TrackInfo[]>(likedQueryKey);
      if (previous !== undefined) {
        if (nextLiked) {
          if (!previous.some((t) => t.id === track.id)) {
            queryClient.setQueryData<TrackInfo[]>(likedQueryKey, [track, ...previous]);
          }
        } else {
          queryClient.setQueryData<TrackInfo[]>(
            likedQueryKey,
            previous.filter((t) => t.id !== track.id),
          );
        }
      }
      return { previous };
    },
    onError: (err, nextLiked, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(likedQueryKey, context.previous);
      }
      toast.error(t(nextLiked ? 'trackMenu.likeError' : 'trackMenu.unlikeError'));
      void logger.error(`[like] Failed to toggle like for track ${track?.id}: ${String(err)}`);
    },
    onSuccess: (_data, nextLiked) => {
      void logger.info(`[like] ${nextLiked ? 'Liked' : 'Unliked'} track ${track?.id}`);
    },
  });

  function onToggle() {
    if (!track || likeMutation.isPending) return;
    likeMutation.mutate(!isLiked);
  }

  if (!track) return undefined;

  return { isLiked, isLoading: likeMutation.isPending, onToggle };
}
