import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { TrackRowSkeletonList } from '@/components/TrackRowSkeleton';
import { RefreshButton } from '@/components/ui/refresh-button';
import { SearchBar } from '@/components/ui/search-bar';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { CardListView } from '@/components/CardListView';
import { PlaylistCard } from './PlaylistCard';
import { PlaylistListRow } from './PlaylistListRow';
import type { ArtistPlaylist } from '@/bindings';

export interface PlaylistGridLabels {
  error: string;
  empty: string;
  search: string;
  noResults: string;
  loading: string;
}

interface PlaylistGridProps {
  data: ArtistPlaylist[] | undefined;
  isLoading: boolean;
  isStreaming?: boolean;
  error: Error | null;
  refetch: () => void;
  labels: PlaylistGridLabels;
  onSelectPlaylist: (playlist: ArtistPlaylist) => void;
}

export function PlaylistGrid({ data, isLoading, isStreaming, error, refetch, labels, onSelectPlaylist }: PlaylistGridProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!data || !search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return data.filter((p) => p.title.toLowerCase().includes(q));
  }, [data, search]);

  if (isLoading) return <TrackRowSkeletonList />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-12">
        <p className="text-sm text-muted-foreground">{t(labels.error)}</p>
        <RefreshButton onRefresh={refetch} aria-label={t('common.refresh')} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">{t(labels.empty)}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder={t(labels.search)} className="flex-1" />
        <ViewModeToggle />
      </div>
      {filtered.length > 0 ? (
        <CardListView
          items={filtered}
          getKey={(p) => p.id}
          renderCard={(p) => <PlaylistCard playlist={p} onClick={() => onSelectPlaylist(p)} />}
          renderRow={(p) => <PlaylistListRow playlist={p} onClick={() => onSelectPlaylist(p)} />}
        />
      ) : !isStreaming ? (
        <p className="text-sm text-muted-foreground text-center py-12">{t(labels.noResults)}</p>
      ) : null}
      {isStreaming && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{t(labels.loading)}</span>
        </div>
      )}
    </div>
  );
}
