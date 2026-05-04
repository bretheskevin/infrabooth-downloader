import { useCallback, useRef } from 'react';
import { commands } from '@/bindings';
import type { TrackCore } from '@/bindings';
import { logger } from '@/lib/logger';

interface CachedTrackInfo {
  title: string;
  artist: string;
}

export function useTrackDownloader() {
  const trackInfoCache = useRef<Map<string, CachedTrackInfo>>(new Map());

  const downloadTrack = useCallback(async (track: TrackCore, outputDir: string): Promise<void> => {
    trackInfoCache.current.set(track.trackId, {
      title: track.title,
      artist: track.artist,
    });

    try {
      const result = await commands.downloadTrackFull({
        ...track,
        album: null,
        trackNumber: null,
        totalTracks: null,
        outputDir,
      });
      if (result.status === 'error') {
        throw new Error(result.error.message);
      }
    } catch (error) {
      void logger.error(`Failed to download track ${track.trackId}: ${error}`);
      throw error;
    }
  }, []);

  const getTrackInfo = useCallback((trackId: string) => {
    return trackInfoCache.current.get(trackId);
  }, []);

  return { downloadTrack, getTrackInfo };
}
