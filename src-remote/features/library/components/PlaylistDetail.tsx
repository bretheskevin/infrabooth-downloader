import { ChevronLeft, Play, Loader2 } from 'lucide-react';
import type { RemoteCommand, RemoteState } from '@/lib/remote-protocol';
import { Button } from '@/components/ui/button';
import { t } from '@remote/lib/i18n';
import TrackList from '@remote/components/TrackList';
import { usePlaylistTracks } from '../hooks/usePlaylistTracks';
import type { LibraryPlaylist } from '../utils/filterPlaylists';
import { sendPlayToggle } from '@remote/lib/playToggle';

interface Props {
  host: string;
  token: string;
  playlist: LibraryPlaylist;
  language: string;
  state: RemoteState | null;
  send: (cmd: RemoteCommand) => void;
  onBack: () => void;
}

export default function PlaylistDetail({ host, token, playlist, language, state, send, onBack }: Props) {
  const { tracks, loading, error, refetch } = usePlaylistTracks(host, token, playlist.id, playlist.secretToken);

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 px-2 text-muted-foreground">
            <ChevronLeft className="size-4" />
            {t('back', language)}
          </Button>
        </div>
        <div className="px-4 pb-3">
          <h2 className="text-base font-semibold text-foreground truncate">{playlist.title}</h2>
          <p className="text-xs text-muted-foreground">
            {playlist.username} &middot; {playlist.trackCount} {t('tracks', language)}
          </p>
          {tracks.length > 0 && (
            <Button size="sm" className="mt-2 gap-1" onClick={() => send({ type: 'playTracks', tracks, startIndex: 0 })}>
              <Play className="size-3" fill="currentColor" />
              {t('playAll', language)}
            </Button>
          )}
        </div>
      </div>
      {loading && (
        <div className="flex justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center gap-2 p-4">
          <p className="text-sm text-muted-foreground">{t('libraryError', language)}</p>
          <Button variant="ghost" size="sm" onClick={refetch}>
            {t('retry', language)}
          </Button>
        </div>
      )}
      {!loading && !error && (
        <TrackList
          tracks={tracks}
          state={state}
          send={send}
          language={language}
          onPlay={(track, index) => sendPlayToggle(send, state, track, tracks, index)}
        />
      )}
    </div>
  );
}
