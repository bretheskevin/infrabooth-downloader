import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/tauri';
import { isAntibotError } from '@/lib/errorMessages';
import { getErrorString } from '@/lib/utils';
import { LIBRARY_PLAYLISTS_KEY } from '@/lib/query';
import { logger } from '@/lib/logger';
import type { LibraryPlaylist, TrackInfo } from '@/bindings';

interface EditPlaylistParams {
  playlistId: number;
  title: string;
  sharing: string | null;
  trackIds: number[];
}

export function useEditPlaylist(onSuccess?: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ playlistId, title, sharing, trackIds }: EditPlaylistParams) => api.updatePlaylist(playlistId, title, sharing, trackIds),
    onMutate: async ({ playlistId, title, sharing, trackIds }) => {
      await queryClient.cancelQueries({ queryKey: ['playlist-tracks', playlistId] });
      await queryClient.cancelQueries({ queryKey: [LIBRARY_PLAYLISTS_KEY] });

      const previousTracks = queryClient.getQueryData<TrackInfo[]>(['playlist-tracks', playlistId]);
      const previousLibrary = queryClient.getQueriesData<LibraryPlaylist[]>({
        queryKey: [LIBRARY_PLAYLISTS_KEY],
      });

      if (previousTracks) {
        const keep = new Set(trackIds);
        queryClient.setQueryData<TrackInfo[]>(
          ['playlist-tracks', playlistId],
          previousTracks.filter((track) => keep.has(track.id)),
        );
      }

      queryClient.setQueriesData<LibraryPlaylist[]>({ queryKey: [LIBRARY_PLAYLISTS_KEY] }, (old) =>
        old?.map((p) =>
          p.id === playlistId
            ? { ...p, title, track_count: trackIds.length, ...(sharing !== null && { is_public: sharing === 'public' }) }
            : p,
        ),
      );

      return { previousTracks, previousLibrary, playlistId };
    },
    onSuccess: (_data, { title }) => {
      toast.success(t('playlistMenu.editSuccess', { playlist: title }));
      onSuccessRef.current?.();
    },
    onError: (error, _vars, context) => {
      if (context?.previousTracks !== undefined) {
        queryClient.setQueryData(['playlist-tracks', context.playlistId], context.previousTracks);
      }
      context?.previousLibrary?.forEach(([key, data]) => queryClient.setQueryData(key, data));

      const errorKey = isAntibotError(error) ? 'errors.antibotBlocked' : 'playlistMenu.editFailed';
      toast.error(t(errorKey));
      void logger.error(`[useEditPlaylist] ${getErrorString(error)}`);
    },
    onSettled: (_data, _error, { playlistId }) => {
      void queryClient.invalidateQueries({ queryKey: ['playlist-tracks', playlistId] });
      void api.clearLibraryCache().then(() => {
        queryClient.invalidateQueries({ queryKey: [LIBRARY_PLAYLISTS_KEY] });
        queryClient.invalidateQueries({ queryKey: ['playlist-artwork', playlistId] });
      });
    },
  });

  const editPlaylist = useCallback(
    async (params: EditPlaylistParams): Promise<boolean> => {
      try {
        await mutateAsync(params);
        return true;
      } catch {
        return false;
      }
    },
    [mutateAsync],
  );

  return { editPlaylist, isEditing: isPending };
}
