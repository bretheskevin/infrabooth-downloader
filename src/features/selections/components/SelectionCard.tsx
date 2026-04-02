import { useMemo } from 'react';
import { Download, Music } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Selection } from '@/bindings';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getArtworkUrl } from '@/lib/soundcloud';
import { useIsDownloadEnabled } from '@/features/settings/hooks/useIsDownloadEnabled';

interface SelectionCardProps {
  mix: Selection;
  index: number;
  label?: string;
  onClick: () => void;
  onDownload: () => void;
}

export function SelectionCard({ mix, index, label, onClick, onDownload }: SelectionCardProps) {
  const { t } = useTranslation();
  const isDownloadEnabled = useIsDownloadEnabled();
  const mixNumber = index + 1;
  const artworkUrl = mix.tracks[0]?.artwork_url ?? mix.artworkUrl ?? null;
  const MAX_PREVIEW_ARTISTS = 5;
  const { artistPreview, fullArtistList } = useMemo(() => {
    const seen = new Set<string>();
    for (const track of mix.tracks) {
      const name = track.user.username;
      if (name && !seen.has(name)) seen.add(name);
    }
    const artists = [...seen];
    const full = artists.join(', ');
    if (artists.length > MAX_PREVIEW_ARTISTS) {
      return {
        artistPreview: `${artists.slice(0, MAX_PREVIEW_ARTISTS).join(', ')} +${artists.length - MAX_PREVIEW_ARTISTS}`,
        fullArtistList: full,
      };
    }
    return { artistPreview: full, fullArtistList: full };
  }, [mix.tracks]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-border bg-card overflow-hidden text-left transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative h-24 bg-secondary">
        {artworkUrl ? (
          <img
            src={getArtworkUrl(artworkUrl, 300) || undefined}
            alt={mix.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Music className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm px-2.5 py-1 flex items-center justify-between">
          <span className="text-xs font-extrabold text-white tracking-wide">
            {label ? label.toUpperCase() : `${t('selections.cardLabel').toUpperCase()} ${mixNumber}`}
          </span>
          <span className="text-[10px] text-white/70">
            {t('selections.trackCount', { count: mix.trackCount })}
          </span>
        </div>
        {isDownloadEnabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('selections.downloadAll')}
                className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/40 text-white backdrop-blur-sm border border-white/15 hover:bg-black/60 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload();
                }}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('selections.downloadAll')}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="px-2.5 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-[11px] text-muted-foreground truncate">{artistPreview}</p>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-64">
            <p className="text-xs">{fullArtistList}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </button>
  );
}
