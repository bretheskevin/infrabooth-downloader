import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrackRowSkeletonList } from '@/components/TrackRowSkeleton';
import { RefreshButton } from '@/components/ui/refresh-button';
import { SearchBar } from '@/components/ui/search-bar';
import { useArtistPlaylists } from '../hooks/useArtistPlaylists';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { CardListView } from '@/components/CardListView';
import { PlaylistCard } from './PlaylistCard';
import { PlaylistListRow } from './PlaylistListRow';
import type { ArtistPlaylist } from '@/bindings';

interface PlaylistGridProps {
  artistId: number;
  onSelectPlaylist: (playlist: ArtistPlaylist) => void;
}

export function PlaylistGrid({ artistId, onSelectPlaylist }: PlaylistGridProps) {
  const { t } = useTranslation();
  const { data: playlists, isLoading, error, refetch } = useArtistPlaylists(artistId);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!playlists || !search.trim()) return playlists ?? [];
    const q = search.toLowerCase();
    return playlists.filter((p) => p.title.toLowerCase().includes(q));
  }, [playlists, search]);

  if (isLoading) return <TrackRowSkeletonList />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-12">
        <p className="text-sm text-muted-foreground">{t('artistProfile.playlistsError')}</p>
        <RefreshButton onRefresh={refetch} aria-label={t('common.refresh')} />
      </div>
    );
  }

  if (!playlists || playlists.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        {t('artistProfile.noPlaylists')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('artistProfile.searchPlaylists')}
          className="flex-1"
        />
        <ViewModeToggle />
      </div>
      {filtered.length > 0 ? (
        <CardListView
          items={filtered}
          getKey={(p) => p.id}
          renderCard={(p) => <PlaylistCard playlist={p} onClick={() => onSelectPlaylist(p)} />}
          renderRow={(p) => <PlaylistListRow playlist={p} onClick={() => onSelectPlaylist(p)} />}
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-12">
          {t('artistProfile.noPlaylistResults')}
        </p>
      )}
    </div>
  );
}
