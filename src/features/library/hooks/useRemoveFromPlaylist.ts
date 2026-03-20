import { api } from '@/lib/tauri';
import { usePlaylistMutation } from '@/hooks/usePlaylistMutation';

export function useRemoveFromPlaylist(onSuccess?: () => void) {
  const { mutate, mutatingPlaylistId } = usePlaylistMutation(
    {
      apiCall: api.removeTrackFromPlaylist,
      successKey: 'trackMenu.removedFromPlaylist',
      errorMatchers: [{ pattern: 'not found in playlist', key: 'trackMenu.notInPlaylist' }],
      fallbackErrorKey: 'trackMenu.removeFailed',
    },
    onSuccess,
  );

  return { removeFromPlaylist: mutate, removingFromPlaylistId: mutatingPlaylistId };
}
