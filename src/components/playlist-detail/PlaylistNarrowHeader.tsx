import { useTranslation } from 'react-i18next';
import { Music } from 'lucide-react';
import { DetailHeader } from '@/components/DetailHeader';
import { PrivatePlaylistLock } from '@/components/PrivatePlaylistLock';
import { ArtistLink } from '@/components/ArtistLink';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { formatTotalDuration } from '@/lib/format';
import type { BreadcrumbItem } from '@/components/ui/breadcrumb';
import type { PlaylistData } from './types';

interface PlaylistNarrowHeaderProps {
  playlist: PlaylistData;
  artworkUrl: string | null;
  trackCount: number;
  breadcrumbItems: BreadcrumbItem[];
  folderMetadata: React.ReactNode;
  actions?: React.ReactNode;
}

export function PlaylistNarrowHeader({
  playlist,
  artworkUrl,
  trackCount,
  breadcrumbItems,
  folderMetadata,
  actions,
}: PlaylistNarrowHeaderProps) {
  const { t } = useTranslation();

  const durationText = playlist.duration != null && playlist.duration > 0 ? ` · ${formatTotalDuration(playlist.duration)}` : '';

  return (
    <DetailHeader
      navigation={<Breadcrumb items={[...breadcrumbItems, { label: playlist.title }]} />}
      artwork={
        <div data-testid="artwork-container" className="bg-muted overflow-hidden shrink-0 w-12 h-12 rounded-lg">
          {artworkUrl ? (
            <img src={artworkUrl} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Music data-testid="artwork-placeholder-icon" className="w-5 h-5" />
            </div>
          )}
        </div>
      }
      title={
        !playlist.isPublic ? (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="truncate">{playlist.title}</span>
            <PrivatePlaylistLock className="h-4 w-4" />
          </span>
        ) : (
          playlist.title
        )
      }
      subtitle={
        <>
          {playlist.userId != null ? (
            <ArtistLink userId={playlist.userId} username={playlist.username ?? ''} />
          ) : playlist.username ? (
            playlist.username
          ) : null}
          {` · ${t('library.detail.tracks', { count: trackCount })}${durationText}`}
        </>
      }
      folderMetadata={folderMetadata}
      actions={actions}
    />
  );
}
