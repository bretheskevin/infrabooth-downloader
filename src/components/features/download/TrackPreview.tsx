import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Download, Clock, Loader2 } from 'lucide-react';
import type { TrackInfo } from '@/types/playlist';
import { formatDuration } from '@/lib/utils';

interface TrackPreviewProps {
  track: TrackInfo;
  onDownload: () => void;
  isDownloading?: boolean;
}

export function TrackPreview({
  track,
  onDownload,
  isDownloading,
}: TrackPreviewProps) {
  const { t } = useTranslation();

  return (
    <Card className="mt-4" data-testid="track-preview">
      <CardContent className="flex items-center gap-4 p-4">
        {/* Artwork */}
        <div className="flex-shrink-0">
          {track.artwork_url ? (
            <img
              src={track.artwork_url}
              alt={track.title}
              className="w-16 h-16 rounded-md object-cover"
              data-testid="track-artwork"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-md bg-muted flex items-center justify-center"
              data-testid="track-artwork-placeholder"
            >
              <Music className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" data-testid="track-title">
            {track.title}
          </h3>
          <p
            className="text-sm text-muted-foreground truncate"
            data-testid="track-artist"
          >
            {track.user.username}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <div
              className="flex items-center gap-1 text-sm text-muted-foreground"
              data-testid="track-duration"
            >
              <Clock className="h-3 w-3" />
              {formatDuration(track.duration)}
            </div>
            <span className="text-sm" data-testid="track-count">
              {t('download.singleTrack')}
            </span>
            <Badge
              variant="secondary"
              className="text-xs"
              data-testid="quality-badge"
            >
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
          {isDownloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isDownloading ? t('download.downloading') : t('download.button')}
        </Button>
      </CardContent>
    </Card>
  );
}
