import { useCallback, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/tauri';

export function useAddToPlaylist(onSuccess?: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<number | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const addToPlaylist = useCallback(
    async (playlistId: number, playlistTitle: string, trackId: number): Promise<boolean> => {
      setAddingToPlaylistId(playlistId);
      try {
        await api.addTrackToPlaylist(playlistId, trackId);
        toast.success(t('trackMenu.addedToPlaylist', { playlist: playlistTitle }));
        onSuccessRef.current?.();
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ['playlist-tracks', playlistId] }),
          queryClient.invalidateQueries({ queryKey: ['owned-playlists-for-track', trackId] }),
        ]);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('already in this playlist')) {
          toast.error(t('trackMenu.alreadyAdded'));
        } else {
          toast.error(t('trackMenu.addFailed'));
        }
        return false;
      } finally {
        setAddingToPlaylistId(null);
      }
    },
    [t, queryClient],
  );

  return { addToPlaylist, addingToPlaylistId };
}
