import { formatDuration } from '@/lib/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrackActionsDropdown } from '@/components/TrackActionsDropdown';
import type { MessageTrackEmbed, TrackInfo } from '@/bindings';
import { ArtistLink } from '@/components/ArtistLink';
import type { DownloadState } from '@/types/download';
import { TrackDownloadAction } from '@/components/TrackDownloadAction';

interface MessageTrackCardProps {
  embed: MessageTrackEmbed;
  track: TrackInfo;
  onPlay: () => void;
  downloadState: DownloadState;
  onDownload: () => void;
  onRetry: () => void;
}

export function MessageTrackCard({ embed, track, onPlay, downloadState, onDownload, onRetry }: MessageTrackCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay();
        }
      }}
      className="mt-1.5 flex items-center gap-3 rounded-lg border bg-muted/30 p-2.5 max-w-[420px] cursor-pointer transition-colors hover:bg-accent/50 w-full text-left"
    >
      <Avatar className="h-11 w-11 rounded-md flex-shrink-0">
        <AvatarImage src={embed.artwork_url ?? undefined} alt={embed.title} />
        <AvatarFallback className="rounded-md text-xs">▶</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{embed.title}</p>
        <ArtistLink userId={embed.artist_id} username={embed.artist} className="text-xs text-muted-foreground truncate" />
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">{formatDuration(embed.duration_ms)}</span>
      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <TrackDownloadAction state={downloadState} onDownload={onDownload} onRetry={onRetry} />
        <TrackActionsDropdown track={track} triggerClassName="h-7 w-7" contentSide="bottom" contentAlign="end" />
      </div>
    </div>
  );
}
