import { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RefreshButton } from '@/components/ui/refresh-button';
import { useFollowedArtists } from '../hooks/useFollowedArtists';
import { useNewTracksStore } from '../store';
import { useSettingsStore } from '@/features/settings/store';
import { ArtistAvatar } from './ArtistAvatar';
import type { FollowedArtist } from '@/bindings';

interface NewTracksCarouselProps {
  onSelectArtist: (artist: FollowedArtist) => void;
}

export function NewTracksCarousel({ onSelectArtist }: NewTracksCarouselProps) {
  const { t } = useTranslation();
  const { artists, isLoading, error, refresh } = useFollowedArtists();
  const selectedArtistId = useNewTracksStore((s) => s.selectedArtist?.id);
  const hideReposts = useSettingsStore((s) => s.hideReposts);
  const displayedArtists = useMemo(
    () => (hideReposts ? artists.filter((a) => a.has_original_tracks) : artists),
    [artists, hideReposts],
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [displayedArtists, updateScrollState]);

  if (isLoading) return null;

  if (error && artists.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{t('newTracks.title')}</h3>
          <RefreshButton onRefresh={refresh} aria-label={t('newTracks.retry')} />
        </div>
      </div>
    );
  }

  if (displayedArtists.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth',
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{t('newTracks.title')}</h3>
        <RefreshButton onRefresh={refresh} aria-label={t('newTracks.refresh')} />
        <Label htmlFor="hide-reposts" className="flex items-center gap-1.5 ml-auto cursor-pointer">
          <Switch
            id="hide-reposts"
            checked={hideReposts}
            onCheckedChange={(checked) => useSettingsStore.getState().setHideReposts(checked)}
            className="h-4 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&_span]:h-3 [&_span]:w-3"
          />
          <span className="text-xs text-muted-foreground">
            {t('newTracks.hideReposts')}
          </span>
        </Label>
      </div>
      <div className="relative group">
        {canScrollLeft && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            aria-label={t('newTracks.scrollLeft')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm rounded-full h-7 w-7 shadow-md opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-3 overflow-x-auto scrollbar-none py-1 px-1"
        >
          {displayedArtists.map((artist) => (
            <ArtistAvatar
              key={artist.id}
              artist={artist}
              isSelected={selectedArtistId === artist.id}
              onClick={() => onSelectArtist(artist)}
            />
          ))}
        </div>
        {canScrollRight && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            aria-label={t('newTracks.scrollRight')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm rounded-full h-7 w-7 shadow-md opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
