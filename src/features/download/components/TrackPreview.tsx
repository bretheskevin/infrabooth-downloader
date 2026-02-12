import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import type { TrackInfo } from '@/features/download/types/playlist';
import { formatDuration } from '@/lib/utils';
import { ArtworkThumbnail } from './ArtworkThumbnail';
import { DownloadButton } from './DownloadButton';

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
        <ArtworkThumbnail
          src={track.artwork_url}
          alt={track.title}
          testIdPrefix="track"
        />

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
          </div>
        </div>

        <DownloadButton onDownload={onDownload} isDownloading={isDownloading} />
      </CardContent>
    </Card>
  );
}
