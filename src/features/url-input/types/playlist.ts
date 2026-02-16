// Re-export types from generated bindings
export type { UserInfo, TrackInfo, PlaylistInfo } from '@/bindings';

import type { PlaylistInfo, TrackInfo } from '@/bindings';

export function isPlaylist(
  media: PlaylistInfo | TrackInfo | null
): media is PlaylistInfo {
  return media !== null && 'tracks' in media;
}
