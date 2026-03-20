import { api } from '@/lib/tauri';
import { usePlaylistMutation } from './usePlaylistMutation';

export function useAddToPlaylist(onSuccess?: () => void) {
  const { mutate, mutatingPlaylistId } = usePlaylistMutation(
    {
      apiCall: api.addTrackToPlaylist,
      successKey: 'trackMenu.addedToPlaylist',
      errorMatchers: [{ pattern: 'already in this playlist', key: 'trackMenu.alreadyAdded' }],
      fallbackErrorKey: 'trackMenu.addFailed',
    },
    onSuccess,
  );

  return { addToPlaylist: mutate, addingToPlaylistId: mutatingPlaylistId };
}
