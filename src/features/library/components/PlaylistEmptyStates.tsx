import { useTranslation } from 'react-i18next';
import type { TrackInfo } from '@/bindings';

interface PlaylistEmptyStatesProps {
  tracks: TrackInfo[] | undefined;
  displayTracks: TrackInfo[];
  isLoading: boolean;
}

export function PlaylistEmptyStates({ tracks, displayTracks, isLoading }: PlaylistEmptyStatesProps) {
  const { t } = useTranslation();

  if (tracks && tracks.length === 0 && !isLoading) {
    return (
      <p className="text-center py-12 text-sm text-muted-foreground">
        {t('library.detail.emptyPlaylist')}
      </p>
    );
  }

  if (tracks && tracks.length > 0 && displayTracks.length === 0) {
    return (
      <p className="text-center py-12 text-sm text-muted-foreground">
        {t('library.detail.noFilterResults')}
      </p>
    );
  }

  return null;
}
