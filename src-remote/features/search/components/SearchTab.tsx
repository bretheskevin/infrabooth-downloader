import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { RemoteCommand, RemoteState } from '@/lib/remote-protocol';
import { SearchBar } from '@/components/ui/search-bar';
import { FilterChips } from '@/components/FilterChips';
import { useDebounce } from '@/lib/useDebounce';
import { t } from '@remote/lib/i18n';
import { useResourceSearch } from '../hooks/useResourceSearch';
import { searchTracks } from '../api/searchTracks';
import { searchPlaylists } from '../api/searchPlaylists';
import { searchAlbums } from '../api/searchAlbums';
import TrackList from '@remote/components/TrackList';
import { sendPlayToggle } from '@remote/lib/playToggle';
import SelectionsSection from '@remote/features/selections/components/SelectionsSection';
import SelectionDetail from '@remote/features/selections/components/SelectionDetail';
import PlaylistList from '@remote/components/PlaylistList';
import PlaylistDetail from '@remote/components/PlaylistDetail';
import type { RemoteSelection } from '@remote/features/selections/api/selections';
import type { LibraryPlaylist } from '@remote/lib/playlistMapping';

type SearchType = 'tracks' | 'playlists' | 'albums';

const DEBOUNCE_MS = 400;

const TYPE_OPTIONS: { key: SearchType; label: string }[] = [
  { key: 'tracks', label: 'tabTracks' },
  { key: 'playlists', label: 'tabPlaylists' },
  { key: 'albums', label: 'tabAlbums' },
];

interface Props {
  host: string;
  token: string;
  send: (cmd: RemoteCommand) => void;
  language: string;
  state: RemoteState | null;
}

export default function SearchTab({ host, token, send, language, state }: Props) {
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<SearchType>('tracks');
  const [selectedMix, setSelectedMix] = useState<RemoteSelection | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<LibraryPlaylist | null>(null);
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  const { results: trackResults, loading: tracksLoading } = useResourceSearch(host, token, debouncedQuery, searchTracks);
  const { results: playlistResults, loading: playlistsLoading } = useResourceSearch(host, token, debouncedQuery, searchPlaylists);
  const { results: albumResults, loading: albumsLoading } = useResourceSearch(host, token, debouncedQuery, searchAlbums);

  if (selectedMix) {
    return <SelectionDetail selection={selectedMix} language={language} state={state} send={send} onBack={() => setSelectedMix(null)} />;
  }

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
      <div className="sticky top-0 z-10 p-3 bg-background space-y-2">
        <SearchBar value={query} onChange={setQuery} placeholder={t('searchPlaceholder', language)} />
        <FilterChips options={TYPE_OPTIONS} active={activeType} onChange={setActiveType} />
      </div>

      {activeType === 'tracks' && (
        <>
          <div className={query.trim() ? 'hidden' : undefined}>
            <SelectionsSection host={host} token={token} language={language} onSelect={setSelectedMix} />
          </div>
          {tracksLoading && (
            <div className="flex justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {!tracksLoading && query.trim() && trackResults.length === 0 && (
            <p className="text-center p-4 text-sm text-muted-foreground">{t('noResults', language)}</p>
          )}
          {query.trim() && (
            <TrackList
              tracks={trackResults}
              state={state}
              send={send}
              language={language}
              onPlay={(track) => sendPlayToggle(send, state, track, [track], 0)}
            />
          )}
        </>
      )}

      {activeType === 'playlists' && (
        <>
          {!query.trim() && <p className="text-center p-4 text-sm text-muted-foreground">{t('searchPlaylistsPrompt', language)}</p>}
          {playlistsLoading && (
            <div className="flex justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {query.trim() && !playlistsLoading && (
            <PlaylistList host={host} token={token} playlists={playlistResults} language={language} onSelect={setSelectedPlaylist} />
          )}
        </>
      )}

      {activeType === 'albums' && (
        <>
          {!query.trim() && <p className="text-center p-4 text-sm text-muted-foreground">{t('searchAlbumsPrompt', language)}</p>}
          {albumsLoading && (
            <div className="flex justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {query.trim() && !albumsLoading && (
            <PlaylistList host={host} token={token} playlists={albumResults} language={language} onSelect={setSelectedPlaylist} />
          )}
        </>
      )}
    </div>
  );
}
