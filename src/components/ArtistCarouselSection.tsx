import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RefreshButton } from '@/components/ui/refresh-button';
import { ScrollCarousel } from '@/components/ui/scroll-carousel';
import { ArtistAvatar } from '@/components/ArtistAvatar';
import type { FollowedArtist } from '@/bindings';

interface CarouselLabels {
  title: string;
  hideReposts: string;
  scrollLeft: string;
  scrollRight: string;
}

interface ArtistCarouselSectionProps {
  labels: CarouselLabels;
  artists: FollowedArtist[];
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
  selectedArtistId?: number;
  onSelectArtist: (artist: FollowedArtist) => void;
  hideReposts: boolean;
  onHideRepostsChange: (checked: boolean) => void;
  hideRepostsId: string;
  filterFn: (artist: FollowedArtist) => boolean;
  getHasNew?: (artist: FollowedArtist) => boolean;
}

export function ArtistCarouselSection({
  labels, artists, isLoading, error, onRefresh,
  selectedArtistId, onSelectArtist,
  hideReposts, onHideRepostsChange, hideRepostsId,
  filterFn, getHasNew,
}: ArtistCarouselSectionProps) {
  const displayedArtists = useMemo(
    () => (hideReposts ? artists.filter(filterFn) : artists),
    [artists, hideReposts, filterFn],
  );

  if (isLoading) return null;

  if (error && artists.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{labels.title}</h3>
          <RefreshButton onRefresh={onRefresh} aria-label={labels.title} />
        </div>
      </div>
    );
  }

  if (displayedArtists.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{labels.title}</h3>
        <RefreshButton onRefresh={onRefresh} aria-label={labels.title} />
        <Label htmlFor={hideRepostsId} className="flex items-center gap-1.5 ml-auto cursor-pointer">
          <Switch
            id={hideRepostsId}
            checked={hideReposts}
            onCheckedChange={onHideRepostsChange}
            className="h-4 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30 [&_span]:h-3 [&_span]:w-3"
          />
          <span className="text-xs text-muted-foreground">{labels.hideReposts}</span>
        </Label>
      </div>
      <ScrollCarousel ariaLabelLeft={labels.scrollLeft} ariaLabelRight={labels.scrollRight}>
        {displayedArtists.map((artist) => (
          <ArtistAvatar
            key={artist.id}
            artist={artist}
            hasNew={getHasNew?.(artist)}
            isSelected={selectedArtistId === artist.id}
            onClick={() => onSelectArtist(artist)}
          />
        ))}
      </ScrollCarousel>
    </div>
  );
}
