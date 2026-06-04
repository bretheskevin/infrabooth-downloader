import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { LibraryPlaylist } from '@/bindings';
import { getErrorString } from '@/lib/utils';
import { isAntibotError } from '@/lib/errorMessages';
import { api } from '@/lib/tauri';
import { LIBRARY_PLAYLISTS_KEY } from '@/lib/query';
import { logger } from '@/lib/logger';

export function useDeletePlaylist(onSuccess?: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (playlistId: number) => api.deletePlaylist(playlistId),
    onSuccess: (_data, playlistId) => {
      toast.success(t('playlistMenu.deleted'));
      queryClient.setQueriesData<LibraryPlaylist[]>({ queryKey: [LIBRARY_PLAYLISTS_KEY] }, (old) =>
        old?.filter((p) => p.id !== playlistId),
      );
      void api.removePlaylistFromLibraryCache(playlistId);
      onSuccessRef.current?.();
    },
    onError: (error) => {
      const errorKey = isAntibotError(error) ? 'errors.antibotBlocked' : 'playlistMenu.deleteFailed';
      toast.error(t(errorKey));
      void logger.error(`[useDeletePlaylist] ${getErrorString(error)}`);
    },
  });

  const deletePlaylist = useCallback(
    async (playlistId: number): Promise<boolean> => {
      try {
        await mutateAsync(playlistId);
        return true;
      } catch {
        return false;
      }
    },
    [mutateAsync],
  );

  return { deletePlaylist, isDeleting: isPending };
}
