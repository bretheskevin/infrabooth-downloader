import { ScrollArea } from '@/components/ui/scroll-area';
import { useQueueStore } from '@/features/download/store';
import { useTranslation } from 'react-i18next';
import { TrackCard } from './TrackCard';

export function TrackList() {
  const { t } = useTranslation();
  const tracks = useQueueStore((state) => state.tracks);
  const currentIndex = useQueueStore((state) => state.currentIndex);
  const isInitializing = useQueueStore((state) => state.isInitializing);

  if (tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        {t('progress.trackList.emptyState')}
      </div>
    );
  }

  return (
    <ScrollArea
      className="h-full"
      aria-label={t('progress.trackList.ariaLabel', 'Download queue')}
    >
      <div role="list" className="space-y-2 p-2">
        {tracks.map((track, index) => (
          <TrackCard
            key={track.id}
            track={track}
            isCurrentTrack={index === currentIndex}
            isInitializing={isInitializing && index === 0}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
