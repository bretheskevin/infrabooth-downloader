import { toast } from 'sonner';
import i18n from '@/lib/i18n';
import { api } from '@/lib/tauri';
import { buildPlaybackQueue } from './buildPlaybackQueue';
import type { PlaybackItem } from '../types';

export async function fetchStationTracks(trackId: number): Promise<PlaybackItem[]> {
  const related = await api.fetchRelatedTracks(trackId, 10);
  return buildPlaybackQueue(related);
}

export async function fetchStationTracksWithRetry(trackId: number): Promise<PlaybackItem[] | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetchStationTracks(trackId);
    } catch {
      if (attempt === 1) {
        toast.error(i18n.t('player.autoplayError'));
        return null;
      }
    }
  }
  return null;
}
