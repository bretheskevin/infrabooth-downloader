import { useTranslation } from 'react-i18next';
import { ListMusic } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArtistLink } from '@/components/ArtistLink';
import type { MessagePlaylistEmbed } from '@/bindings';

interface MessagePlaylistCardProps {
  embed: MessagePlaylistEmbed;
  onOpen: () => void;
}

export function MessagePlaylistCard({ embed, onOpen }: MessagePlaylistCardProps) {
  const { t } = useTranslation();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="mt-1.5 flex items-center gap-3 rounded-lg border bg-muted/30 p-2.5 max-w-[420px] cursor-pointer transition-colors hover:bg-accent/50 w-full text-left"
    >
      <Avatar className="h-11 w-11 rounded-md flex-shrink-0">
        <AvatarImage src={embed.artwork_url ?? undefined} alt={embed.title} />
        <AvatarFallback className="rounded-md text-xs">
          <ListMusic className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{embed.title}</p>
        <ArtistLink userId={embed.artist_id} username={embed.artist} className="text-xs text-muted-foreground truncate" />
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">{t('directMessages.trackCount', { count: embed.track_count })}</span>
    </div>
  );
}
