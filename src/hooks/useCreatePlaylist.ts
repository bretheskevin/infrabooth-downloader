import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getErrorString } from '@/lib/utils';
import { isAntibotError } from '@/lib/errorMessages';
import { api } from '@/lib/tauri';
import { LIBRARY_PLAYLISTS_KEY } from '@/lib/query';
import { logger } from '@/lib/logger';

interface CreatePlaylistParams {
  title: string;
  sharing: string;
  trackId: number;
}

export function useCreatePlaylist(onSuccess?: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ title, sharing, trackId }: CreatePlaylistParams) => api.createPlaylist(title, sharing, trackId),
    onSuccess: (_data, { title, trackId }) => {
      toast.success(t('trackMenu.createdPlaylist', { playlist: title }));
      onSuccessRef.current?.();
      void api
        .clearLibraryCache()
        .then(() =>
          Promise.all([
            queryClient.invalidateQueries({ queryKey: [LIBRARY_PLAYLISTS_KEY] }),
            queryClient.invalidateQueries({ queryKey: ['owned-playlists-for-track', trackId] }),
          ]),
        );
    },
    onError: (error) => {
      const errorKey = isAntibotError(error) ? 'errors.antibotBlocked' : 'trackMenu.createFailed';
      toast.error(t(errorKey));
      void logger.error(`[useCreatePlaylist] ${getErrorString(error)}`);
    },
  });

  const createPlaylist = useCallback(
    async (title: string, sharing: string, trackId: number): Promise<boolean> => {
      try {
        await mutateAsync({ title, sharing, trackId });
        return true;
      } catch {
        return false;
      }
    },
    [mutateAsync],
  );

  return { createPlaylist, isCreating: isPending };
}
