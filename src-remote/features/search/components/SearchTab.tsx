import { Loader2 } from 'lucide-react';
import type { RemoteCommand, RemoteState } from '@/lib/remote-protocol';
import { Input } from '@/components/ui/input';
import { t } from '@remote/lib/i18n';
import { useTrackSearch } from '../hooks/useTrackSearch';
import TrackList from '@remote/components/TrackList';
import { sendPlayToggle } from '@remote/lib/playToggle';

interface Props {
  host: string;
  token: string;
  send: (cmd: RemoteCommand) => void;
  language: string;
  state: RemoteState | null;
}

export default function SearchTab({ host, token, send, language, state }: Props) {
  const { query, setQuery, results, loading } = useTrackSearch(host, token);

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
      <TrackList
        tracks={results}
        state={state}
        send={send}
        language={language}
        onPlay={(track) => sendPlayToggle(send, state, track, [track], 0)}
      />
    </div>
  );
}
