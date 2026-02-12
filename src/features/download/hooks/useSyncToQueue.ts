import { useEffect } from 'react';
import { useQueueStore } from '@/features/download/store';
import { trackInfoToQueueTrack, playlistTracksToQueueTracks } from '@/features/download/utils/transforms';
import { isPlaylist } from '@/features/download/types/playlist';
import type { PlaylistInfo, TrackInfo } from '@/features/download/types/playlist';

/**
 * Domain reaction: "media loaded → feed queue"
 * This is NOT fetch logic — it's a domain event handler.
 */
export function useSyncToQueue(media: PlaylistInfo | TrackInfo | null): void {
  const enqueueTracks = useQueueStore((state) => state.enqueueTracks);

  useEffect(() => {
    if (!media) return;

    // Domain reaction: playlist/track loaded → enqueue for download
    if (isPlaylist(media)) {
      enqueueTracks(playlistTracksToQueueTracks(media.tracks));
    } else {
      enqueueTracks([trackInfoToQueueTrack(media)]);
    }
  }, [media, enqueueTracks]);
}
