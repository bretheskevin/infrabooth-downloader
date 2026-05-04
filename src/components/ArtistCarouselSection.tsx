import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RefreshButton } from '@/components/ui/refresh-button';
import { ScrollCarousel } from '@/components/ui/scroll-carousel';
import { ArtistAvatar } from '@/components/ArtistAvatar';
import { useIsWidescreen } from '@/hooks/useIsWidescreen';
import { cn } from '@/lib/utils';
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
  getHasNewAny?: (artist: FollowedArtist) => boolean;
  getHasNewOriginal?: (artist: FollowedArtist) => boolean;
}

export function ArtistCarouselSection({
  labels,
  artists,
  isLoading,
  error,
  onRefresh,
  selectedArtistId,
  onSelectArtist,
  hideReposts,
  onHideRepostsChange,
  hideRepostsId,
  filterFn,
  getHasNewAny,
  getHasNewOriginal,
}: ArtistCarouselSectionProps) {
  const isWidescreen = useIsWidescreen();
  const getHasNew = hideReposts ? getHasNewOriginal : getHasNewAny;
  const displayedArtists = useMemo(() => {
    const filtered = hideReposts ? artists.filter(filterFn) : artists;
    if (!getHasNew) return filtered;
    return [...filtered].sort((a, b) => Number(getHasNew(b)) - Number(getHasNew(a)));
  }, [artists, hideReposts, filterFn, getHasNew]);

  if (isLoading) return null;

  const sectionHeaderRow = cn('flex items-center gap-2', isWidescreen && 'border-b border-border/40 pb-2 mb-1');
  const sectionHeaderTitle = cn('font-semibold', isWidescreen ? 'text-[15px]' : 'text-sm');

  if (error && artists.length === 0) {
    return (
      <div className="space-y-2">
        <div className={sectionHeaderRow}>
          <h3 className={sectionHeaderTitle}>{labels.title}</h3>
          <RefreshButton onRefresh={onRefresh} aria-label={labels.title} />
        </div>
      </div>
    );
  }

  if (displayedArtists.length === 0) return null;

  const avatars = displayedArtists.map((artist) => (
    <ArtistAvatar
      key={artist.id}
      artist={artist}
      hasNew={getHasNew?.(artist)}
      isSelected={selectedArtistId === artist.id}
      onClick={() => onSelectArtist(artist)}
    />
  ));

  return (
    <div className="space-y-2">
      <div className={sectionHeaderRow}>
        <h3 className={sectionHeaderTitle}>{labels.title}</h3>
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
      {isWidescreen ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-3 py-1 px-1">{avatars}</div>
      ) : (
        <ScrollCarousel ariaLabelLeft={labels.scrollLeft} ariaLabelRight={labels.scrollRight}>
          {avatars}
        </ScrollCarousel>
      )}
    </div>
  );
}
