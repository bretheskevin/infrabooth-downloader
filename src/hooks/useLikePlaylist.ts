import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import { LIBRARY_PLAYLISTS_KEY } from '@/lib/query';
import { getApiErrorMessage } from '@/lib/errorMessages';
import { useAuthStore } from '@/features/auth/store';
import type { LibraryPlaylist } from '@/bindings';
import type { LikeState } from '@/hooks/useLikeTrack';

export interface LikePlaylistInput {
  id: number;
  title: string;
  artwork_url: string | null;
  permalink_url: string;
  track_count: number;
  username: string | null;
  user_id: number | null;
  duration: number | null;
}

export function useLikePlaylist(playlist?: LikePlaylistInput): LikeState | undefined {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const username = useAuthStore((s) => s.username);

  const libraryQueryKey = [LIBRARY_PLAYLISTS_KEY, username] as const;

  const likedStatus = useQuery({
    queryKey: libraryQueryKey,
    queryFn: skipToken,
    select: (data: LibraryPlaylist[] | undefined) => (playlist ? (data?.some((p) => p.id === playlist.id && !p.is_owned) ?? false) : false),
  });

  const isLiked = likedStatus.data ?? false;

  const likeMutation = useMutation({
    mutationFn: async (nextLiked: boolean) => {
      if (!playlist) return;
      if (nextLiked) {
        await api.likePlaylist(playlist.id);
      } else {
        await api.unlikePlaylist(playlist.id);
      }
    },
    onMutate: async (nextLiked: boolean) => {
      if (!playlist) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: libraryQueryKey });
      const previous = queryClient.getQueryData<LibraryPlaylist[]>(libraryQueryKey);
      if (previous !== undefined) {
        if (nextLiked) {
          if (!previous.some((p) => p.id === playlist.id)) {
            const optimistic: LibraryPlaylist = {
              id: playlist.id,
              title: playlist.title,
              username: playlist.username ?? '',
              user_id: playlist.user_id,
              artwork_url: playlist.artwork_url,
              track_count: playlist.track_count,
              duration: playlist.duration ?? 0,
              permalink_url: playlist.permalink_url,
              is_owned: false,
              is_public: true,
              secret_token: null,
            };
            queryClient.setQueryData<LibraryPlaylist[]>(libraryQueryKey, [optimistic, ...previous]);
          }
        } else {
          queryClient.setQueryData<LibraryPlaylist[]>(
            libraryQueryKey,
            previous.filter((p) => p.id !== playlist.id),
          );
        }
      }
      return { previous };
    },
    onError: (err, nextLiked, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(libraryQueryKey, context.previous);
      }
      toast.error(getApiErrorMessage(err, t, nextLiked ? 'playlistMenu.likeError' : 'playlistMenu.unlikeError'));
      void logger.error(`[like] Failed to toggle like for playlist ${playlist?.id}: ${String(err)}`);
    },
    onSuccess: (_data, nextLiked) => {
      toast.success(t(nextLiked ? 'playlistMenu.likeSuccess' : 'playlistMenu.unlikeSuccess'));
      void logger.info(`[like] ${nextLiked ? 'Liked' : 'Unliked'} playlist ${playlist?.id}`);
    },
  });

  function onToggle() {
    if (!playlist || likeMutation.isPending) return;
    likeMutation.mutate(!isLiked);
  }

  if (!playlist) return undefined;

  return { isLiked, isLoading: likeMutation.isPending, onToggle };
}
