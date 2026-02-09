import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Download } from 'lucide-react';
import type { PlaylistInfo } from '@/types/playlist';

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
        {/* Artwork */}
        <div className="flex-shrink-0">
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt={playlist.title}
              className="w-16 h-16 rounded-md object-cover"
              data-testid="playlist-artwork"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-md bg-muted flex items-center justify-center"
              data-testid="playlist-artwork-placeholder"
            >
              <Music className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

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
            <Badge variant="secondary" className="text-xs">
              256kbps AAC → MP3
            </Badge>
          </div>
        </div>

        {/* Download Button */}
        <Button
          onClick={onDownload}
          disabled={isDownloading}
          className="flex-shrink-0"
          data-testid="download-button"
        >
          <Download className="mr-2 h-4 w-4" />
          {t('download.button')}
        </Button>
      </CardContent>
    </Card>
  );
}
