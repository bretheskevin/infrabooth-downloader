import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import type { TrackInfo } from '@/features/url-input/types/playlist';
import { formatDuration } from '@/lib/utils';
import { ArtworkThumbnail } from './ArtworkThumbnail';
import { DownloadBar } from './DownloadBar';

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
    <Card className="mt-6 card-hover border-border/50 bg-card/80 backdrop-blur-sm" data-testid="track-preview">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-5">
          <ArtworkThumbnail
            src={track.artwork_url}
            alt={track.title}
            testIdPrefix="track"
            className="shadow-elevated"
          />

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate" data-testid="track-title">
              {track.title}
            </h3>
            <p
              className="text-sm text-muted-foreground truncate mt-0.5"
              data-testid="track-artist"
            >
              {track.user.username}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div
                className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-secondary text-secondary-foreground"
                data-testid="track-duration"
              >
                <Clock className="h-3 w-3" />
                {formatDuration(track.duration)}
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary" data-testid="track-count">
                {t('download.singleTrack')}
              </span>
            </div>
          </div>
        </div>

        <DownloadBar onDownload={onDownload} isDownloading={isDownloading} />
      </CardContent>
    </Card>
  );
}
