import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface PlaylistMutationConfig {
  apiCall: (playlistId: number, trackId: number) => Promise<void>;
  successKey: string;
  errorMatchers: Array<{ pattern: string; key: string }>;
  fallbackErrorKey: string;
}

export function usePlaylistMutation(config: PlaylistMutationConfig, onSuccess?: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [mutatingPlaylistId, setMutatingPlaylistId] = useState<number | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const mutate = useCallback(
    async (playlistId: number, playlistTitle: string, trackId: number): Promise<boolean> => {
      setMutatingPlaylistId(playlistId);
      try {
        await config.apiCall(playlistId, trackId);
        toast.success(t(config.successKey, { playlist: playlistTitle }));
        onSuccessRef.current?.();
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ['playlist-tracks', playlistId] }),
          queryClient.invalidateQueries({ queryKey: ['owned-playlists-for-track', trackId] }),
        ]);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const matchedError = config.errorMatchers.find((m) => message.includes(m.pattern));
        toast.error(t(matchedError?.key ?? config.fallbackErrorKey));
        return false;
      } finally {
        setMutatingPlaylistId(null);
      }
    },
    [t, queryClient, config],
  );

  return { mutate, mutatingPlaylistId };
}
