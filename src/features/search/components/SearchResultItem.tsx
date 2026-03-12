import { useTranslation } from 'react-i18next';
import { Download, Check, RotateCw, Loader2 } from 'lucide-react';
import type { TrackInfo } from '@/bindings';
import { formatDuration, formatBytes, getArtworkUrl } from '@/lib/utils';
import type { DownloadState } from '../types';

interface SearchResultItemProps {
  track: TrackInfo;
  state: DownloadState;
  onDownload: () => void;
  onRetry: () => void;
}

export function SearchResultItem({ track, state, onDownload, onRetry }: SearchResultItemProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-b-0">
      {/* Artwork */}
      <div className="h-12 w-12 rounded-md bg-secondary flex-shrink-0 overflow-hidden">
        {track.artwork_url ? (
          <img
            src={getArtworkUrl(track.artwork_url) ?? undefined}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-secondary" />
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{track.title}</p>
        {state.status === 'error' ? (
          <p className="text-xs text-destructive truncate">
            {state.error ?? 'Download failed'}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {track.user.username} · {formatDuration(track.duration)}
          </p>
        )}
        {/* Progress bar */}
        {state.status === 'downloading' && (
          <div className="mt-1 h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(state.progress ?? 0) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="flex-shrink-0">
        {state.status === 'idle' && (
          <button
            type="button"
            onClick={onDownload}
            aria-label={t('library.detail.download')}
            className="h-8 w-8 rounded-md bg-secondary/70 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        {state.status === 'downloading' && (
          (state.progress ?? 0) > 0 ? (
            <div className="flex flex-col items-end min-w-[32px]">
              <span className="text-xs font-medium text-primary text-center">
                {Math.round(state.progress! * 100)}%
              </span>
              {state.totalBytes != null && state.downloadedBytes != null && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatBytes(state.downloadedBytes)} / {formatBytes(state.totalBytes)}
                </span>
              )}
            </div>
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )
        )}
        {state.status === 'completed' && (
          <div className="h-8 w-8 rounded-md bg-green-50 dark:bg-green-950/30 flex items-center justify-center text-green-600">
            <Check className="h-4 w-4" />
          </div>
        )}
        {state.status === 'error' && (
          <button
            type="button"
            onClick={onRetry}
            aria-label={t('library.detail.retry')}
            className="h-8 w-8 rounded-md bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive transition-colors"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
