import type { TFunction } from 'i18next';
import { getArtworkUrl, type ArtworkSize } from '@/lib/soundcloud';
import type { ReleaseActivityItem } from '@/bindings';
import { RELEASE_TYPE_KEYS } from '../constants';

export interface ReleaseMeta {
  artworkUrl: string | null;
  typeLabel: string;
  isRepost: boolean;
  activityLabel: string;
}

export function getReleaseMeta(
  item: ReleaseActivityItem,
  t: TFunction,
  artworkSize: ArtworkSize,
): ReleaseMeta {
  const isRepost = item.activity_type === 'Repost';
  return {
    artworkUrl: getArtworkUrl(item.release.artwork_url, artworkSize),
    typeLabel: t(RELEASE_TYPE_KEYS[item.release.release_type]),
    isRepost,
    activityLabel: t(isRepost ? 'newReleases.reposted' : 'newReleases.new'),
  };
}
