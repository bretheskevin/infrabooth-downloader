import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePlayerStore } from '@/features/player';
import type { PlaybackItem } from '@/features/player';
import { MessageTrackCard } from './MessageTrackCard';
import type { ConversationMessage, MessageTrackEmbed, MessageUser } from '@/bindings';
import { formatChatTimestamp } from '@/lib/date';
import { useResolveTrackEmbed } from '../hooks/useResolveTrackEmbed';
import { linkifyText } from '@/lib/linkify';
import { useAuthStore } from '@/features/auth/store';

interface MessageRowProps {
  message: ConversationMessage;
  currentUserId: number;
  otherUser: MessageUser | null;
}

function toPlaybackItem(embed: MessageTrackEmbed): PlaybackItem {
  return {
    trackId: embed.id,
    trackUrl: embed.permalink_url,
    title: embed.title,
    artist: embed.artist,
    artistId: embed.artist_id,
    artworkUrl: embed.artwork_url,
    durationMs: embed.duration_ms,
    waveformUrl: embed.waveform_url,
  };
}

export function MessageRow({ message, currentUserId, otherUser }: MessageRowProps) {
  const { t, i18n } = useTranslation();
  const isOwnMessage = message.sender_id === currentUserId;

  const myAvatarUrl = useAuthStore((s) => s.avatarUrl);
  const senderName = isOwnMessage ? t('directMessages.you') : (otherUser?.username ?? '');
  const senderAvatar = isOwnMessage ? myAvatarUrl : otherUser?.avatar_url;

  const { embed: trackEmbed, scUrl } = useResolveTrackEmbed(message.content);
  const displayContent = scUrl ? message.content.replace(scUrl, '').trim() : message.content;

  const timestamp = formatChatTimestamp(message.sent_at, i18n.language);

  if (isOwnMessage) {
    return (
      <div className="flex gap-2.5 items-start justify-end">
        <div className="min-w-0 max-w-[75%]">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs text-muted-foreground">{timestamp}</span>
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarImage src={senderAvatar ?? undefined} alt={senderName} />
              <AvatarFallback className="text-[10px]">{senderName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
          {displayContent && <p className="text-sm text-foreground/80 mt-0.5 text-right">{linkifyText(displayContent)}</p>}
          {trackEmbed && (
            <MessageTrackCard
              embed={trackEmbed}
              onPlay={() => void usePlayerStore.getState().play([toPlaybackItem(trackEmbed)], 0)}
              onCopyLink={() => void navigator.clipboard.writeText(trackEmbed.permalink_url)}
              onOpenInBrowser={() => void open(trackEmbed.permalink_url)}
              onAddToQueue={() => usePlayerStore.getState().addToQueue(toPlaybackItem(trackEmbed))}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 items-start">
      <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
        <AvatarImage src={senderAvatar ?? undefined} alt={senderName} />
        <AvatarFallback className="text-[10px]">{senderName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 max-w-[75%]">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{senderName}</span>
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        </div>
        {displayContent && <p className="text-sm text-foreground/80 mt-0.5">{linkifyText(displayContent)}</p>}
        {trackEmbed && (
          <MessageTrackCard
            embed={trackEmbed}
            onPlay={() => void usePlayerStore.getState().play([toPlaybackItem(trackEmbed)], 0)}
            onCopyLink={() => void navigator.clipboard.writeText(trackEmbed.permalink_url)}
            onOpenInBrowser={() => void open(trackEmbed.permalink_url)}
            onAddToQueue={() => usePlayerStore.getState().addToQueue(toPlaybackItem(trackEmbed))}
          />
        )}
      </div>
    </div>
  );
}
