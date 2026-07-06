import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { RemoteCommand, RemoteState } from '@/lib/remote-protocol';
import { Input } from '@/components/ui/input';
import { t } from '@remote/lib/i18n';
import { useTrackSearch } from '../hooks/useTrackSearch';
import TrackList from '@remote/components/TrackList';
import { sendPlayToggle } from '@remote/lib/playToggle';
import SelectionsSection from '@remote/features/selections/components/SelectionsSection';
import SelectionDetail from '@remote/features/selections/components/SelectionDetail';
import type { RemoteSelection } from '@remote/features/selections/api/selections';

interface Props {
  host: string;
  token: string;
  send: (cmd: RemoteCommand) => void;
  language: string;
  state: RemoteState | null;
}

export default function SearchTab({ host, token, send, language, state }: Props) {
  const { query, setQuery, results, loading } = useTrackSearch(host, token);
  const [selectedMix, setSelectedMix] = useState<RemoteSelection | null>(null);

  if (selectedMix) {
    return <SelectionDetail selection={selectedMix} language={language} state={state} send={send} onBack={() => setSelectedMix(null)} />;
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 p-3 bg-background">
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('searchPlaceholder', language)} />
      </div>
      <div className={query.trim() ? 'hidden' : undefined}>
        <SelectionsSection host={host} token={token} language={language} onSelect={setSelectedMix} />
      </div>
      {loading && (
        <div className="flex justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      {!loading && query.trim() && results.length === 0 && (
        <p className="text-center p-4 text-sm text-muted-foreground">{t('noResults', language)}</p>
      )}
      {query.trim() && (
        <TrackList
          tracks={results}
          state={state}
          send={send}
          language={language}
          onPlay={(track) => sendPlayToggle(send, state, track, [track], 0)}
        />
      )}
    </div>
  );
}
