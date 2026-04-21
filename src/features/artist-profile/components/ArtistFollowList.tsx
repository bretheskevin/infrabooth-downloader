import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { SearchBar } from '@/components/ui/search-bar';
import { TrackRowSkeletonList } from '@/components/TrackRowSkeleton';
import { RefreshButton } from '@/components/ui/refresh-button';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { useArtistFollowList } from '../hooks/useArtistFollowList';
import { useArtistProfileStore } from '../store';
import { ArtistFollowRow } from './ArtistFollowRow';

const FOLLOW_ROW_HEIGHT = 56;

interface ArtistFollowListProps {
  type: 'followers' | 'followings';
  artistId: number;
  artistName: string;
}

export function ArtistFollowList({ type, artistId, artistName }: ArtistFollowListProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { data: artists, isLoading, isStreaming, error, refetch } = useArtistFollowList(type, artistId);

  const filtered = useMemo(() => {
    if (!artists || !search.trim()) return artists ?? [];
    const q = search.toLowerCase();
    return artists.filter((a) => a.username.toLowerCase().includes(q));
  }, [artists, search]);

  const { parentRef, virtualItems, totalSize } = useVirtualizedList({
    count: filtered.length,
    itemHeight: FOLLOW_ROW_HEIGHT,
  });

  const label = type === 'followers' ? t('artistProfile.followers') : t('artistProfile.followings');
  const searchPlaceholder = type === 'followers' ? t('artistProfile.searchFollowers') : t('artistProfile.searchFollowings');
  const noResults = type === 'followers' ? t('artistProfile.noFollowersResults') : t('artistProfile.noFollowingsResults');

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0 px-3">
      <Breadcrumb
        items={[
          { label: artistName, onClick: () => useArtistProfileStore.getState().goBack() },
          { label },
        ]}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={searchPlaceholder}
      />

      {isLoading ? (
        <TrackRowSkeletonList />
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-12">
          <p className="text-sm text-muted-foreground">{t('artistProfile.error')}</p>
          <RefreshButton onRefresh={refetch} aria-label={t('common.refresh')} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          {filtered.length > 0 ? (
            <VirtualListContainer parentRef={parentRef} totalSize={totalSize} className="flex-1 min-h-0">
              {virtualItems.map((virtualItem) => {
                const artist = filtered[virtualItem.index];
                if (!artist) return null;
                return (
                  <VirtualRow key={artist.id} size={virtualItem.size} start={virtualItem.start}>
                    <ArtistFollowRow
                      artist={artist}
                      onClick={() => useArtistProfileStore.getState().openProfile(artist.id, artist.username)}
                    />
                  </VirtualRow>
                );
              })}
            </VirtualListContainer>
          ) : !isStreaming ? (
            <p className="text-sm text-muted-foreground text-center py-12">{noResults}</p>
          ) : null}
          {isStreaming && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
