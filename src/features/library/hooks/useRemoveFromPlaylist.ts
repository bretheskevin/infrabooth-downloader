import { type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { usePlaylistMutation } from '@/hooks/usePlaylistMutation';
import type { TrackInfo, PlaylistForTrackPicker } from '@/bindings';

async function optimisticRemove(queryClient: QueryClient, playlistId: number, trackId: number) {
  const tracksKey = ['playlist-tracks', playlistId];
  const membershipKey = ['owned-playlists-for-track', trackId];

  await Promise.all([
    queryClient.cancelQueries({ queryKey: tracksKey }),
    queryClient.cancelQueries({ queryKey: membershipKey }),
  ]);

  const previousTracks = queryClient.getQueryData<TrackInfo[]>(tracksKey);
  const previousMembership = queryClient.getQueryData<PlaylistForTrackPicker[]>(membershipKey);

  if (previousTracks) {
    queryClient.setQueryData<TrackInfo[]>(tracksKey, previousTracks.filter((t) => t.id !== trackId));
  }
  if (previousMembership) {
    queryClient.setQueryData<PlaylistForTrackPicker[]>(
      membershipKey,
      previousMembership.map((p) => (p.id === playlistId ? { ...p, contains_track: false } : p)),
    );
  }

  return () => {
    if (previousTracks !== undefined) queryClient.setQueryData(tracksKey, previousTracks);
    if (previousMembership !== undefined) queryClient.setQueryData(membershipKey, previousMembership);
  };
}

export function useRemoveFromPlaylist(onSuccess?: () => void) {
  const { mutate, mutatingPlaylistId } = usePlaylistMutation(
    {
      apiCall: api.removeTrackFromPlaylist,
      successKey: 'trackMenu.removedFromPlaylist',
      errorMatchers: [{ pattern: 'not found in playlist', key: 'trackMenu.notInPlaylist' }],
      fallbackErrorKey: 'trackMenu.removeFailed',
      optimisticUpdate: optimisticRemove,
    },
    onSuccess,
  );

  return { removeFromPlaylist: mutate, removingFromPlaylistId: mutatingPlaylistId };
}
