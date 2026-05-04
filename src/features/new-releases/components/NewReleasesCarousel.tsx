import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArtistCarouselSection } from '@/components/ArtistCarouselSection';
import { useFollowedArtistsReleases } from '../hooks/useFollowedArtistsReleases';
import { useNewReleasesStore } from '../store';
import { useSettingsStore } from '@/features/settings/store';
import type { FollowedArtist } from '@/bindings';

const filterOriginalReleases = (a: FollowedArtist) => a.has_original_releases;
const getHasNewAnyReleases = (a: FollowedArtist) => a.has_new_releases;
const getHasNewOriginalReleases = (a: FollowedArtist) => a.has_new_original_releases;

export function NewReleasesCarousel() {
  const { t } = useTranslation();
  const { artists, isLoading, error, refresh } = useFollowedArtistsReleases();
  const viewState = useNewReleasesStore((s) => s.viewState);
  const selectedArtistId = viewState.view !== 'carousel' ? viewState.artist.id : undefined;
  const hideReposts = useSettingsStore((s) => s.hideReleasesReposts);

  const handleSelectArtist = useCallback((artist: FollowedArtist) => {
    useNewReleasesStore.getState().setSelectedArtist(artist);
  }, []);

  const handleHideRepostsChange = useCallback((checked: boolean) => useSettingsStore.getState().setHideReleasesReposts(checked), []);

  return (
    <ArtistCarouselSection
      labels={{
        title: t('newReleases.title'),
        hideReposts: t('common.hideReposts'),
        scrollLeft: t('common.scrollLeft'),
        scrollRight: t('common.scrollRight'),
      }}
      artists={artists}
      isLoading={isLoading}
      error={error}
      onRefresh={refresh}
      selectedArtistId={selectedArtistId}
      onSelectArtist={handleSelectArtist}
      hideReposts={hideReposts}
      onHideRepostsChange={handleHideRepostsChange}
      hideRepostsId="hide-releases-reposts"
      filterFn={filterOriginalReleases}
      getHasNewAny={getHasNewAnyReleases}
      getHasNewOriginal={getHasNewOriginalReleases}
    />
  );
}
