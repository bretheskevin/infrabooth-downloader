import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MessageUserEmbed } from '@/bindings';

interface MessageUserCardProps {
  embed: MessageUserEmbed;
  onOpen: () => void;
}

export function MessageUserCard({ embed, onOpen }: MessageUserCardProps) {
  const { t } = useTranslation();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className="mt-1.5 flex items-center gap-3 rounded-lg border bg-muted/30 p-2.5 max-w-[420px] cursor-pointer transition-colors hover:bg-accent/50 w-full text-left"
    >
      <Avatar className="h-11 w-11 flex-shrink-0">
        <AvatarImage src={embed.avatar_url ?? undefined} alt={embed.username} />
        <AvatarFallback className="text-xs"><User className="h-4 w-4" /></AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{embed.username}</p>
        <p className="text-xs text-muted-foreground">
          {t('directMessages.followersCount', { count: embed.followers_count })}
        </p>
      </div>
    </div>
  );
}
