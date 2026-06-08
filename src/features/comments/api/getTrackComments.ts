import { api } from '@/lib/tauri';

export function getTrackComments(trackId: number, offset: number) {
  return api.getTrackComments(trackId, offset);
}
