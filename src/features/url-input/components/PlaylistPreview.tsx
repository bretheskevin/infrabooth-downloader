import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { PreserveOrderToggle } from '@/components/PreserveOrderToggle';
import { commands } from '@/bindings';
import type { PlaylistInfo } from '@/features/url-input/types/playlist';
import { useSettingsStore } from '@/features/settings/store';
import { getArtworkUrl } from '@/lib/soundcloud';
import { ArtworkThumbnail } from './ArtworkThumbnail';
import { DownloadBar } from './DownloadBar';

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
  const downloadPath = useSettingsStore((s) => s.downloadPath);
  const [existingCount, setExistingCount] = useState(0);

  useEffect(() => {
    if (!downloadPath || playlist.tracks.length === 0) {
      setExistingCount(0);
      return;
    }

    const trackIds = playlist.tracks.map((track) => String(track.id));
    commands
      .scanExistingTracks(downloadPath, trackIds)
      .then((result) => setExistingCount(Object.keys(result).length))
      .catch(() => setExistingCount(0));
  }, [downloadPath, playlist.id, playlist.tracks]);

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
              {existingCount > 0 && (
                <span
                  className="text-xs font-medium px-2 py-1 rounded-md bg-success/10 text-success"
                  data-testid="already-downloaded-count"
                >
                  {t('download.alreadyDownloaded', { count: existingCount })}
                </span>
              )}
            </div>
          </div>
        </div>

        {playlist.tracks.length > 1 && (
          <div className="py-2 px-1">
            <PreserveOrderToggle />
          </div>
        )}

        <DownloadBar onDownload={onDownload} isDownloading={isDownloading} />
      </CardContent>
    </Card>
  );
}
