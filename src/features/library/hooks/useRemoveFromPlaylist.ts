import { type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { usePlaylistMutation } from '@/hooks/usePlaylistMutation';
import { LIBRARY_PLAYLISTS_KEY } from '@/lib/query';
import type { TrackInfo, PlaylistForTrackPicker, LibraryPlaylist } from '@/bindings';

async function optimisticRemove(queryClient: QueryClient, playlistId: number, trackId: number) {
  const tracksKey = ['playlist-tracks', playlistId];
  const membershipKey = ['owned-playlists-for-track', trackId];
  const libraryFilter = { queryKey: [LIBRARY_PLAYLISTS_KEY] };

  await Promise.all([
    queryClient.cancelQueries({ queryKey: tracksKey }),
    queryClient.cancelQueries({ queryKey: membershipKey }),
    queryClient.cancelQueries(libraryFilter),
  ]);

  const previousTracks = queryClient.getQueryData<TrackInfo[]>(tracksKey);
  const previousMembership = queryClient.getQueryData<PlaylistForTrackPicker[]>(membershipKey);
  const previousLibrary = queryClient.getQueriesData<LibraryPlaylist[]>(libraryFilter);
  const removedCount = previousTracks?.filter((t) => t.id === trackId).length ?? 1;

  if (previousTracks) {
    queryClient.setQueryData<TrackInfo[]>(
      tracksKey,
      previousTracks.filter((t) => t.id !== trackId),
    );
  }
  if (previousMembership) {
    queryClient.setQueryData<PlaylistForTrackPicker[]>(
      membershipKey,
      previousMembership.map((p) => (p.id === playlistId ? { ...p, contains_track: false } : p)),
    );
  }
  queryClient.setQueriesData<LibraryPlaylist[]>(libraryFilter, (old) =>
    old?.map((p) => (p.id === playlistId ? { ...p, track_count: Math.max(0, p.track_count - removedCount) } : p)),
  );

  return () => {
    if (previousTracks !== undefined) queryClient.setQueryData(tracksKey, previousTracks);
    if (previousMembership !== undefined) queryClient.setQueryData(membershipKey, previousMembership);
    for (const [key, data] of previousLibrary) queryClient.setQueryData(key, data);
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
