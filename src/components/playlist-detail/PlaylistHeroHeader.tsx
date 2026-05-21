import { useTranslation } from 'react-i18next';
import { ArrowLeft, Music, Play, Shuffle, ChevronRight } from 'lucide-react';
import { ArtistLink } from '@/components/ArtistLink';
import { ArtistAvatarImage } from '@/components/ArtistAvatarImage';
import { Button } from '@/components/ui/button';
import { useArtistProfile } from '@/features/artist-profile/hooks/useArtistProfile';
import { getArtworkUrl } from '@/lib/soundcloud';
import { formatTotalDuration } from '@/lib/format';
import type { BreadcrumbItem } from '@/components/ui/breadcrumb';
import type { PlaylistData } from './types';

interface PlaylistHeroHeaderProps {
  playlist: PlaylistData;
  artworkUrl: string | null;
  trackCount: number;
  breadcrumbItems: BreadcrumbItem[];
  folderMetadata: React.ReactNode;
  actions?: React.ReactNode;
  onPlayAll?: () => void;
  onShuffle?: () => void;
}

export function PlaylistHeroHeader({
  playlist,
  artworkUrl,
  trackCount,
  breadcrumbItems,
  folderMetadata,
  actions,
  onPlayAll,
  onShuffle,
}: PlaylistHeroHeaderProps) {
  const { t } = useTranslation();
  const { data: profile } = useArtistProfile(playlist.userId);
  const userAvatarUrl = getArtworkUrl(profile?.avatar_url ?? null, 200);

  const backItem = breadcrumbItems[0];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {backItem?.onClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={backItem.onClick}
            className="gap-1.5 -ml-2 h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backItem.label}
          </Button>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-foreground">{playlist.title}</span>
      </div>

      <div className="px-2">
        <div className="flex gap-6">
          <div
            data-testid="artwork-container"
            className="w-[140px] h-[140px] rounded-2xl bg-muted overflow-hidden shrink-0 shadow-elevated-lg"
          >
            {artworkUrl ? (
              <img src={artworkUrl} alt={playlist.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Music data-testid="artwork-placeholder-icon" className="w-10 h-10" />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center gap-2 min-w-0">
            <span className="text-xs text-muted-foreground">
              {playlist.duration != null && playlist.duration > 0
                ? t('library.detail.heroMeta', { count: trackCount, duration: formatTotalDuration(playlist.duration) })
                : t('library.detail.tracks', { count: trackCount })}
            </span>
            <h1 className="text-[34px] font-bold leading-tight tracking-tight truncate">{playlist.title}</h1>
            <div className="flex items-center gap-2">
              {playlist.userId != null ? (
                <>
                  <ArtistAvatarImage avatarUrl={userAvatarUrl} username={playlist.username ?? ''} className="w-5 h-5 text-[10px]" />
                  <ArtistLink userId={playlist.userId} username={playlist.username ?? ''} className="text-sm" />
                </>
              ) : playlist.username ? (
                <span className="text-sm text-muted-foreground">{playlist.username}</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {onShuffle && (
                <Button variant="secondary" size="sm" onClick={onShuffle} className="rounded-full gap-1.5">
                  <Shuffle className="h-3.5 w-3.5" />
                  {t('common.shuffle')}
                </Button>
              )}
              {onPlayAll && (
                <Button size="sm" onClick={onPlayAll} className="rounded-full gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  {t('library.detail.playAll')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-2 space-y-1">
        <span className="text-xs text-muted-foreground">{t('settings.downloadLocation')}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 min-w-0">{folderMetadata}</div>
          {actions && <div className="flex items-center justify-end ml-auto">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
