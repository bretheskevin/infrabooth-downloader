import { useState } from 'react';
import { Play, Pause, Plus, Download, Loader2, Check } from 'lucide-react';
import type { RemoteCommand, RemoteState } from '@/lib/remote-protocol';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { t } from '@remote/lib/i18n';
import { useTrackSearch } from '../hooks/useTrackSearch';

interface Props {
  host: string;
  token: string;
  send: (cmd: RemoteCommand) => void;
  language: string;
  state: RemoteState | null;
}

export default function SearchTab({ host, token, send, language, state }: Props) {
  const { query, setQuery, results, loading } = useTrackSearch(host, token);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 p-3 bg-background">
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('searchPlaceholder', language)} />
      </div>
      {loading && (
        <div className="flex justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      {!loading && query.trim() && results.length === 0 && (
        <p className="text-center p-4 text-sm text-muted-foreground">{t('noResults', language)}</p>
      )}
      <ul>
        {results.map((track) => {
          const artworkUrl = track.artworkUrl?.replace('-large', '-t50x50') ?? null;
          const isCurrent = state?.currentTrack?.trackId === track.trackId;
          const isPlaying = isCurrent && state?.state === 'playing';
          const isDownloading = state?.downloadingTrackIds.includes(track.trackId) ?? false;
          const isDownloaded = state?.downloadedTrackIds.includes(track.trackId) ?? false;
          return (
            <li
              key={track.trackId}
              onClick={() => {
                if (isCurrent) {
                  send(isPlaying ? { type: 'pause' } : { type: 'resume' });
                } else {
                  send({ type: 'playTrack', track });
                }
              }}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer"
            >
              <div className={cn('relative w-10 h-10 flex-shrink-0 rounded overflow-hidden', isCurrent && 'ring-2 ring-primary')}>
                {artworkUrl ? (
                  <img src={artworkUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-secondary" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                  {isPlaying ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4" fill="currentColor" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('truncate text-sm font-medium', isCurrent ? 'text-primary' : 'text-foreground')}>{track.title}</p>
                <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    send({ type: 'queueTrack', track });
                    showToast(t('addedToQueue', language));
                  }}
                  className="h-11 w-11 text-muted-foreground"
                >
                  <Plus />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDownloading || isDownloaded}
                  onClick={(e) => {
                    e.stopPropagation();
                    send({ type: 'downloadTrack', track });
                    showToast(t('downloading', language));
                  }}
                  className={`h-11 w-11 ${isDownloaded ? 'text-success' : 'text-muted-foreground'}`}
                >
                  {isDownloading ? <Loader2 className="animate-spin text-primary" /> : isDownloaded ? <Check /> : <Download />}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm whitespace-nowrap bg-card text-foreground border border-border">
          {toast}
        </div>
      )}
    </div>
  );
}
