import { useTranslation } from 'react-i18next';
import { ArrowLeft, Music, Play, Shuffle, ChevronRight } from 'lucide-react';
import { DetailHeader } from '@/components/DetailHeader';
import { ArtistLink } from '@/components/ArtistLink';
import { ArtistAvatarImage } from '@/components/ArtistAvatarImage';
import { Button } from '@/components/ui/button';
import { useIsWidescreen } from '@/hooks/useIsWidescreen';
import { useArtistProfile } from '@/features/artist-profile/hooks/useArtistProfile';
import { getArtworkUrl } from '@/lib/soundcloud';
import type { LibraryPlaylist } from '@/bindings';
import { formatTotalDuration } from '@/lib/format';

interface PlaylistDetailHeaderProps {
  playlist: LibraryPlaylist;
  artworkUrl: string | null;
  trackCount: number;
  onBack: () => void;
  folderMetadata: React.ReactNode;
  actions?: React.ReactNode;
  onPlayAll?: () => void;
  onShuffle?: () => void;
}

function HeroHeader({
  playlist,
  artworkUrl,
  trackCount,
  onBack,
  folderMetadata,
  actions,
  onPlayAll,
  onShuffle,
}: PlaylistDetailHeaderProps) {
  const { t } = useTranslation();
  const { data: profile } = useArtistProfile(playlist.user_id);
  const userAvatarUrl = getArtworkUrl(profile?.avatar_url ?? null, 200);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 -ml-2 h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('library.detail.breadcrumbLibrary')}
        </Button>
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
              {t('library.detail.heroMeta', {
                count: trackCount,
                duration: formatTotalDuration(playlist.duration),
              })}
            </span>
            <h1 className="text-[34px] font-bold leading-tight tracking-tight truncate">{playlist.title}</h1>
            <div className="flex items-center gap-2">
              <ArtistAvatarImage avatarUrl={userAvatarUrl} username={playlist.username} className="w-5 h-5 text-[10px]" />
              <ArtistLink userId={playlist.user_id} username={playlist.username} className="text-sm" />
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
          <div className="flex items-center gap-1 min-w-0 -ml-1.5">{folderMetadata}</div>
          {actions && <div className="flex items-center justify-end ml-auto">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function PlaylistDetailHeader(props: PlaylistDetailHeaderProps) {
  const isWidescreen = useIsWidescreen();

  if (isWidescreen) {
    return <HeroHeader {...props} />;
  }

  return <NarrowHeader {...props} />;
}

function NarrowHeader({ playlist, artworkUrl, trackCount, onBack, folderMetadata, actions }: PlaylistDetailHeaderProps) {
  const { t } = useTranslation();

  return (
    <DetailHeader
      onBack={onBack}
      title={playlist.title}
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
      subtitle={
        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 min-w-0">
          <span className="truncate min-w-0">
            <ArtistLink userId={playlist.user_id} username={playlist.username} />
            {` · ${t('library.detail.tracks', { count: trackCount })} · ${formatTotalDuration(playlist.duration)}`}
          </span>
          {folderMetadata}
        </div>
      }
      actions={actions}
    />
  );
}
