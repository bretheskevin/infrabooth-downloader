import { t } from '@remote/lib/i18n';
import type { LibraryPlaylist } from '../utils/filterPlaylists';
import { useResolvedArtwork } from '../hooks/useResolvedArtwork';

interface Props {
  host: string;
  token: string;
  playlists: LibraryPlaylist[];
  language: string;
  onSelect: (playlist: LibraryPlaylist) => void;
}

interface ItemProps {
  host: string;
  token: string;
  playlist: LibraryPlaylist;
  language: string;
  onSelect: (playlist: LibraryPlaylist) => void;
}

function PlaylistItem({ host, token, playlist, language, onSelect }: ItemProps) {
  const artwork = useResolvedArtwork(host, token, playlist);
  const artworkUrl = artwork?.replace('-large', '-t50x50') ?? null;

  return (
    <li onClick={() => onSelect(playlist)} className="flex items-center gap-3 px-4 py-3 cursor-pointer">
      {artworkUrl ? (
        <img src={artworkUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded flex-shrink-0 bg-secondary" />
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{playlist.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {playlist.username} &middot; {playlist.trackCount} {t('tracks', language)}
        </p>
      </div>
    </li>
  );
}

export default function PlaylistList({ host, token, playlists, language, onSelect }: Props) {
  if (playlists.length === 0) {
    return <p className="text-center p-4 text-sm text-muted-foreground">{t('noResults', language)}</p>;
  }

  return (
    <ul>
      {playlists.map((playlist) => (
        <PlaylistItem key={playlist.id} host={host} token={token} playlist={playlist} language={language} onSelect={onSelect} />
      ))}
    </ul>
  );
}
