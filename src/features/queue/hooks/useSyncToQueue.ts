import { useEffect } from 'react';
import { useQueueStore } from '@/features/queue/store';
import { trackInfoToQueueTrack, playlistTracksToQueueTracks } from '@/features/queue/utils/transforms';
import { isPlaylist } from '@/features/url-input';
import type { PlaylistInfo, TrackInfo } from '@/features/url-input';

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
