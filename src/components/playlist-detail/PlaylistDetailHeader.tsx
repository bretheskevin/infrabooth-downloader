import { useIsWidescreen } from '@/hooks/useIsWidescreen';
import { PlaylistHeroHeader } from './PlaylistHeroHeader';
import { PlaylistNarrowHeader } from './PlaylistNarrowHeader';
import type { BreadcrumbItem } from '@/components/ui/breadcrumb';
import type { PlaylistData } from './types';

export interface PlaylistDetailHeaderProps {
  playlist: PlaylistData;
  artworkUrl: string | null;
  trackCount: number;
  breadcrumbItems: BreadcrumbItem[];
  folderMetadata: React.ReactNode;
  actions?: React.ReactNode;
  onPlayAll?: () => void;
  onShuffle?: () => void;
}

export function PlaylistDetailHeader(props: PlaylistDetailHeaderProps) {
  const isWidescreen = useIsWidescreen();
  return isWidescreen ? <PlaylistHeroHeader {...props} /> : <PlaylistNarrowHeader {...props} />;
}
