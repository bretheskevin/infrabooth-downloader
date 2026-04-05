import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArtistCarouselSection } from '@/components/ArtistCarouselSection';
import { useFollowedArtists } from '@/hooks/useFollowedArtists';
import { useNewTracksStore } from '../store';
import { useSettingsStore } from '@/features/settings/store';
import type { FollowedArtist } from '@/bindings';

interface NewTracksCarouselProps {
  onSelectArtist: (artist: FollowedArtist) => void;
}

const filterOriginalTracks = (a: FollowedArtist) => a.has_original_tracks;

export function NewTracksCarousel({ onSelectArtist }: NewTracksCarouselProps) {
  const { t } = useTranslation();
  const { artists, isLoading, error, refresh } = useFollowedArtists();
  const selectedArtistId = useNewTracksStore((s) => s.selectedArtist?.id);
  const hideReposts = useSettingsStore((s) => s.hideReposts);

  const handleHideRepostsChange = useCallback(
    (checked: boolean) => useSettingsStore.getState().setHideReposts(checked),
    [],
  );

  return (
    <ArtistCarouselSection
      labels={{
        title: t('newTracks.title'),
        hideReposts: t('common.hideReposts'),
        scrollLeft: t('common.scrollLeft'),
        scrollRight: t('common.scrollRight'),
      }}
      artists={artists}
      isLoading={isLoading}
      error={error}
      onRefresh={refresh}
      selectedArtistId={selectedArtistId}
      onSelectArtist={onSelectArtist}
      hideReposts={hideReposts}
      onHideRepostsChange={handleHideRepostsChange}
      hideRepostsId="hide-reposts"
      filterFn={filterOriginalTracks}
    />
  );
}
