import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreVertical } from 'lucide-react';
import { formatDuration } from '@/lib/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TrackMenuItems } from '@/components/TrackRowActions';
import type { MessageTrackEmbed } from '@/bindings';
import { ArtistLink } from '@/components/ArtistLink';

interface MessageTrackCardProps {
  embed: MessageTrackEmbed;
  onPlay: () => void;
  onCopyLink: () => void;
  onOpenInBrowser: () => void;
  onAddToQueue: () => void;
}

export function MessageTrackCard({ embed, onPlay, onCopyLink, onOpenInBrowser, onAddToQueue }: MessageTrackCardProps) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (!dropdownOpen) onPlay(); }}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !dropdownOpen) { e.preventDefault(); onPlay(); } }}
      className="mt-1.5 flex items-center gap-3 rounded-lg border bg-muted/30 p-2.5 max-w-[420px] cursor-pointer transition-colors hover:bg-accent/50 w-full text-left"
    >
      <Avatar className="h-11 w-11 rounded-md flex-shrink-0">
        <AvatarImage src={embed.artwork_url ?? undefined} alt={embed.title} />
        <AvatarFallback className="rounded-md text-xs">▶</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{embed.title}</p>
        <ArtistLink userId={embed.artist_id} username={embed.artist} className="text-xs text-muted-foreground truncate" />
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">{formatDuration(embed.duration_ms)}</span>
      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('trackMenu.moreActions')}>
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <TrackMenuItems
              onCopyLink={onCopyLink}
              onOpenInBrowser={onOpenInBrowser}
              isSignedIn
              trackId={Number(embed.id)}
              variant="dropdown"
              onCloseMenu={() => setDropdownOpen(false)}
              onAddToQueue={onAddToQueue}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
