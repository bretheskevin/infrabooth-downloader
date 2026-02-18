import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import type { PlaylistInfo } from '@/features/url-input/types/playlist';
import { ArtworkThumbnail } from './ArtworkThumbnail';
import { DownloadBar } from './DownloadBar';

function getArtworkUrl(url: string | null, size: number = 67): string | null {
  if (!url) return null;
  return url.replace('-large', `-t${size}x${size}`);
}

interface PlaylistPreviewProps {
  playlist: PlaylistInfo;
  onDownload: () => void;
  isDownloading?: boolean;
}

export function PlaylistPreview({
  playlist,
  onDownload,
  isDownloading = false,
}: PlaylistPreviewProps) {
  const { t } = useTranslation();

  const artworkUrl = getArtworkUrl(
    playlist.artwork_url ?? playlist.tracks[0]?.artwork_url ?? null
  );

  return (
    <Card className="mt-6 card-hover border-border/50 bg-card/80 backdrop-blur-sm" data-testid="playlist-preview">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-5">
          <ArtworkThumbnail
            src={artworkUrl}
            alt={playlist.title}
            testIdPrefix="playlist"
            className="shadow-elevated"
          />

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate" data-testid="playlist-title">
              {playlist.title}
            </h3>
            <p
              className="text-sm text-muted-foreground truncate mt-0.5"
              data-testid="playlist-creator"
            >
              {playlist.user.username}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-secondary text-secondary-foreground" data-testid="playlist-track-count">
                {t('download.trackCount', { count: playlist.track_count })}
              </span>
            </div>
          </div>
        </div>

        <DownloadBar onDownload={onDownload} isDownloading={isDownloading} />
      </CardContent>
    </Card>
  );
}
