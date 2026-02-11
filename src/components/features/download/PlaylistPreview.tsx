import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import type { PlaylistInfo } from '@/types/playlist';
import { ArtworkThumbnail } from './ArtworkThumbnail';
import { DownloadButton } from './DownloadButton';

/**
 * Transforms SoundCloud artwork URL to a specific size.
 * SoundCloud artwork URLs use size suffixes like -large, -t67x67, etc.
 *
 * @param url - The original artwork URL
 * @param size - The desired size in pixels (default: 67 for 64x64 display)
 * @returns The transformed URL or null if input is null
 */
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
    <Card className="mt-4" data-testid="playlist-preview">
      <CardContent className="flex items-center gap-4 p-4">
        <ArtworkThumbnail
          src={artworkUrl}
          alt={playlist.title}
          testIdPrefix="playlist"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" data-testid="playlist-title">
            {playlist.title}
          </h3>
          <p
            className="text-sm text-muted-foreground truncate"
            data-testid="playlist-creator"
          >
            {playlist.user.username}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm" data-testid="playlist-track-count">
              {t('download.trackCount', { count: playlist.track_count })}
            </span>
          </div>
        </div>

        <DownloadButton onDownload={onDownload} isDownloading={isDownloading} />
      </CardContent>
    </Card>
  );
}
