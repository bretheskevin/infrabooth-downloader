import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import type { RemoteCommand, RemoteState } from '@/lib/remote-protocol';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/ui/search-bar';
import { FilterChips } from '@/components/FilterChips';
import { t } from '@remote/lib/i18n';
import { useLibrary } from '../hooks/useLibrary';
import { filterPlaylists, type LibraryFilter, type LibraryPlaylist } from '../utils/filterPlaylists';
import PlaylistList from '@remote/components/PlaylistList';
import PlaylistDetail from '@remote/components/PlaylistDetail';

interface Props {
  host: string;
  token: string;
  send: (cmd: RemoteCommand) => void;
  language: string;
  state: RemoteState | null;
}

const FILTERS: LibraryFilter[] = ['all', 'mine', 'liked'];

const FILTER_LABELS: Record<LibraryFilter, string> = {
  all: 'filterAll',
  mine: 'filterMine',
  liked: 'filterLiked',
};

const FILTER_OPTIONS = FILTERS.map((f) => ({ key: f, label: FILTER_LABELS[f] }));

export default function LibraryTab({ host, token, send, language, state }: Props) {
  const { playlists, loading, error, refetch } = useLibrary(host, token);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');
  const [selectedPlaylist, setSelectedPlaylist] = useState<LibraryPlaylist | null>(null);

  const filtered = useMemo(() => filterPlaylists(playlists, search, activeFilter), [playlists, search, activeFilter]);

  if (selectedPlaylist) {
    return (
      <PlaylistDetail
        host={host}
        token={token}
        playlist={selectedPlaylist}
        language={language}
        state={state}
        send={send}
        onBack={() => setSelectedPlaylist(null)}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 p-3 bg-background space-y-2">
        <SearchBar value={search} onChange={setSearch} placeholder={t('filterPlaylists', language)} />
        <FilterChips options={FILTER_OPTIONS} active={activeFilter} onChange={setActiveFilter} />
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
        <PlaylistList host={host} token={token} playlists={filtered} language={language} onSelect={setSelectedPlaylist} />
      )}
    </div>
  );
}
